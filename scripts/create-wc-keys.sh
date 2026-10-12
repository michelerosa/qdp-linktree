#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# create-wc-keys.sh
# Crea su ogni shop una chiave REST WooCommerce in SOLA LETTURA per qdp.link
# (via SSH + wp-cli, come fa il pannello) e la scrive in .env.local.
# Le chiavi non vengono mai stampate a schermo.
#
# Uso: scripts/create-wc-keys.sh [--rotate] [SITI]
#   SITI     es. IT,FR (default: IT,FR,DE,ES,EU,CASA,FROZEN)
#   --rotate revoca la chiave qdp.link esistente e ne crea una nuova
#            (senza --rotate, un sito che ha già la chiave viene saltato:
#            il segreto salvato non è recuperabile, la chiave è hashata)
# ─────────────────────────────────────────────

CONFIG_FILE="$HOME/.deploy-kinsta.conf"
SSH_KEY="$HOME/.ssh/id_ed25519"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
DESCRIPTION="qdp.link (sola lettura)"

ROTATE=0
SITES_ARG="IT,FR,DE,ES,EU,CASA,FROZEN"
for arg in "$@"; do
    case "$arg" in
        --rotate) ROTATE=1 ;;
        -h|--help) sed -n '4,15p' "$0"; exit 0 ;;
        *) SITES_ARG="$arg" ;;
    esac
done

# PHP eseguito con `wp eval-file -`: stampa "ck cs" su stdout
read -r -d '' PHP <<'PHP' || true
<?php
global $wpdb;
$desc   = getenv('QDP_DESC');
$rotate = getenv('QDP_ROTATE') === '1';
$table  = $wpdb->prefix . 'woocommerce_api_keys';

$existing = $wpdb->get_col($wpdb->prepare("SELECT key_id FROM {$table} WHERE description = %s", $desc));
if ($existing && !$rotate) {
    WP_CLI::error('chiave già presente (usa --rotate per sostituirla)');
}
foreach ($existing as $id) {
    $wpdb->delete($table, ['key_id' => $id]);
}

$admins = get_users(['role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'order' => 'ASC']);
if (!$admins) {
    WP_CLI::error('nessun amministratore trovato');
}

$ck = 'ck_' . wc_rand_hash();
$cs = 'cs_' . wc_rand_hash();
$ok = $wpdb->insert($table, [
    'user_id'         => $admins[0]->ID,
    'description'     => $desc,
    'permissions'     => 'read',
    'consumer_key'    => wc_api_hash($ck),
    'consumer_secret' => $cs,
    'truncated_key'   => substr($ck, -7),
]);
if (!$ok) {
    WP_CLI::error('inserimento fallito: ' . $wpdb->last_error);
}
echo $ck . ' ' . $cs;
PHP

touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

IFS=',' read -ra WANTED <<< "$SITES_ARG"
failed=0
for name in "${WANTED[@]}"; do
    line="$(grep -E "^${name}\|" "$CONFIG_FILE" || true)"
    if [[ -z "$line" ]]; then
        echo "✗ $name: non trovato in $CONFIG_FILE"
        failed=1
        continue
    fi
    IFS='|' read -r _ user host port <<< "$line"

    if ! out="$(printf '%s' "$PHP" | ssh -i "$SSH_KEY" -p "$port" -o BatchMode=yes "$user@$host" \
        "cd public && QDP_DESC='$DESCRIPTION' QDP_ROTATE=$ROTATE wp eval-file - 2>&1")"; then
        echo "✗ $name: ${out##*Error: }"
        failed=1
        continue
    fi

    read -r ck cs <<< "$(tail -n1 <<< "$out")"
    if [[ "$ck" != ck_* || "$cs" != cs_* ]]; then
        echo "✗ $name: risposta inattesa da wp-cli"
        failed=1
        continue
    fi

    # Sostituisce le righe del sito in .env.local
    tmp="$(mktemp)"
    grep -vE "^WC_${name}_(KEY|SECRET)=" "$ENV_FILE" > "$tmp" || true
    printf 'WC_%s_KEY=%s\nWC_%s_SECRET=%s\n' "$name" "$ck" "$name" "$cs" >> "$tmp"
    mv "$tmp" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "✓ $name: chiave creata (…${ck: -7})"
done

echo ""
echo "Chiavi salvate in $ENV_FILE"
echo "Per Sevalla: grep '^WC_' .env.local | pbcopy  → incolla nelle Environment variables"
exit $failed
