/**
 * Normalizes a name into a unique database key for various types.
 * - Converts `-` to `_`, preserves underscores `_`, and ensures uniqueness.
 * - Dynamically queries the relevant database table (`guild_channels`, `guild_roles`, `guild_emojis`, etc.).
 * - Prevents unnecessary `_1` suffixing on first unique entry.
 * - Applies `_1, _2, _3` correctly for duplicates.
 * - Prevents exceeding Discord’s 32-character limit.
 *
 * @param {string} name - The original name of the item.
 * @param {string} type - The type of item (e.g., "emoji", "channel", "role", "webhook").
 * @param db - The database utility object.
 * @returns {Promise<string>} - A unique and formatted key.
 */
async function normalizeKey(name, type, db) {
    // **Determine the correct table & key column based on the type**
    const tableMapping = {
        emoji: { table: 'guild_emojis', keyColumn: 'emoji_key' },
        channel: { table: 'guild_channels', keyColumn: 'channel_key' },
        role: { table: 'guild_roles', keyColumn: 'role_key' },
        webhook: { table: 'guild_webhooks', keyColumn: 'webhook_key' },
    };

    if (!tableMapping[type]) {
        throw new Error(`🚨 normalizeKey Error: Unsupported type '${type}'`);
    }

    const { table, keyColumn } = tableMapping[type];

    // **Fetch the latest keys dynamically for the specific type**
    const existingKeys = new Set((await db.guild.getAll(`SELECT ${keyColumn} FROM ${table}`))?.map((row) => row[keyColumn]) || []);

    // **Preserve underscores but clean up unwanted characters**
    const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/gi, '') // Keep letters, numbers, spaces, and underscores
        .replace(/[-\s]+/g, '_') // Convert spaces and hyphens to underscores
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    const baseKey = `${type}_${cleanName}`;

    // **If baseKey is unique, return it immediately**
    if (!existingKeys.has(baseKey)) {
        existingKeys.add(baseKey);
        return baseKey;
    }

    // **Handle duplicate keys by appending `_1, _2, _3`**
    let suffix = 1;
    let uniqueKey = baseKey;

    while (existingKeys.has(uniqueKey)) {
        uniqueKey = `${baseKey}_${suffix}`;
        suffix++;

        // **Prevent exceeding Discord’s 32-character limit**
        if (uniqueKey.length > 32) {
            uniqueKey = `${baseKey.slice(0, 29)}_${suffix}`;
        }
    }

    existingKeys.add(uniqueKey);
    return uniqueKey;
}

module.exports = { normalizeKey };
