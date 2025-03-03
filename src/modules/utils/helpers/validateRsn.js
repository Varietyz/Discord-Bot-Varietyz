const validateRsn = (rsn) => {
    if (typeof rsn !== 'string') {
        return {
            valid: false,
            message: '❌ **Invalid RSN:** RSN must be a string.',
        };
    }
    const trimmedRsn = rsn.trim();
    if (trimmedRsn.length < 1 || trimmedRsn.length > 12) {
        return {
            valid: false,
            message: '❌ **Invalid Length:** RSN must be between 1 and 12 characters long.',
        };
    }
    if (!/^[a-zA-Z0-9_]+(?:[ _][a-zA-Z0-9_]+)*$/.test(trimmedRsn)) {
        return {
            valid: false,
            message: '❌ **Invalid Format:** RSN can only contain letters, numbers, underscores, and spaces. Ensure there are no consecutive spaces or underscores.',
        };
    }
    const forbiddenPhrases = ['Java', 'Mod', 'Jagex'];
    if (forbiddenPhrases.some((phrase) => trimmedRsn.toLowerCase().includes(phrase.toLowerCase()))) {
        return {
            valid: false,
            message: '❌ **Forbidden Phrase Detected:** RSN cannot contain phrases like `Java`, `Mod`, or `Jagex`.',
        };
    }
    return { valid: true, message: '' };
};

module.exports = { validateRsn };
