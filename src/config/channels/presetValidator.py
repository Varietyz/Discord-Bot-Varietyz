import json
import difflib
from pathlib import Path

# ANSI colors
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

PRESET_FILE = "varietyz.json"
preset_path = Path("varietyzbot/src/config/channels") / PRESET_FILE
messages_path = Path("varietyzbot/src/config/channelMessages.json")

# Load preset file
print(f"\n{CYAN}🔍 Loading preset file: {preset_path}{RESET}\n")
try:
    with preset_path.open("r", encoding="utf-8") as f:
        preset_data = json.load(f)
    print(f"{GREEN}✅ Preset loaded successfully.{RESET}")
except Exception as e:
    print(f"{RED}❌ Failed to load preset: {e}{RESET}")
    exit(1)

# Load messageKeys
try:
    with messages_path.open("r", encoding="utf-8") as f:
        message_keys = set(json.load(f).keys())
    print(f"{GREEN}✅ channelMessages loaded: {len(message_keys)} keys.{RESET}\n")
except Exception as e:
    print(f"{YELLOW}⚠ Could not load channelMessages.json: {e}{RESET}")
    message_keys = set()

# Configs
required_fields = {"key", "name", "type", "permissionKey"}
valid_channel_types = {
    "GuildText", "GuildVoice", "GuildAnnouncement", "GuildForum",
    "GuildStageVoice", "GuildDirectory"
}
valid_permission_keys = {
    "publicReadOnly", "publicWrite", "staffOnly", "modOnly", "voiceReadNoJoin", "voiceSpeakOnly",
    "readAndReactOnly", "feedbackWriteOnly", "teamOnly", "donatorOnly", "adultOnly", "designerOnly",
    "customRoleOnly", "verifiedReadOnly", "verifiedWrite", "verifiedReadReact", "premiumOnly", "clanOnly"
}
valid_role_fields = {"name", "mentionable", "color"}
valid_webhook_fields = {"enabled", "key", "name"}
valid_top_level_fields = {
    "key", "name", "type", "topic", "permissionKey", "role", "webhook",
    "messageKey", "forumOptions"
}
valid_forum_fields = {"tags", "defaultReactionEmoji", "slowmode", "nsfw", "guidelines"}

def suggest_key(key, valid_set):
    matches = difflib.get_close_matches(key, valid_set, n=1, cutoff=0.7)
    return matches[0] if matches else None

def validate_forum(channel, issues):
    forum = channel.get("forumOptions", {})
    missing = valid_forum_fields - forum.keys()
    if missing:
        issues.append(f"{RED}Missing forumOptions fields: {missing}{RESET}")
    if "tags" in forum and not isinstance(forum["tags"], list):
        issues.append(f"{RED}forumOptions.tags must be a list{RESET}")
    if "slowmode" in forum and not isinstance(forum["slowmode"], int):
        issues.append(f"{RED}forumOptions.slowmode must be an integer{RESET}")
    if "nsfw" in forum and not isinstance(forum["nsfw"], bool):
        issues.append(f"{RED}forumOptions.nsfw must be a boolean{RESET}")
    if "defaultReactionEmoji" in forum and not isinstance(forum["defaultReactionEmoji"], str):
        issues.append(f"{RED}forumOptions.defaultReactionEmoji must be a string{RESET}")

def validate_channel(channel, path):
    print(f"{BOLD}🔎 Validating:{RESET} {CYAN}{path}{RESET}")
    issues = []

    # Detect and fix unexpected top-level keys
    for key in list(channel.keys()):
        if key not in valid_top_level_fields:
            suggestion = suggest_key(key, valid_top_level_fields)
            if suggestion:
                print(f"{YELLOW}⚠ Unrecognized key '{key}' — did you mean '{suggestion}'?{RESET}")
                answer = input("  💡 Autofix it? (Y/n): ").strip().lower()
                if answer in ["y", "yes", ""]:
                    channel[suggestion] = channel.pop(key)
                    issues.append(f"Fixed '{key}' → '{suggestion}'")
                    print(f"{GREEN}  🔧 Fixed '{key}' → '{suggestion}'{RESET}")
                else:
                    issues.append(f"{YELLOW}Unrecognized field '{key}', suggested: '{suggestion}'{RESET}")
            else:
                issues.append(f"{YELLOW}Unknown field '{key}' is not expected in channel definition.{RESET}")

    # Check for missing required fields
    missing_fields = required_fields - channel.keys()
    if missing_fields:
        issues.append(f"{RED}Missing required fields: {missing_fields}{RESET}")
    else:
        print(f"  {GREEN}✔ All required fields present.{RESET}")

    # Validate and potentially auto-fix 'type'
    if "type" in channel:
        if channel["type"] not in valid_channel_types:
            suggestion = difflib.get_close_matches(channel["type"], valid_channel_types, n=1, cutoff=0.7)
            if suggestion:
                print(f"{YELLOW}⚠ Invalid type '{channel['type']}' — did you mean '{suggestion[0]}'?{RESET}")
                answer = input("  💡 Autofix it? (Y/n): ").strip().lower()
                if answer in ["y", "yes", ""]:
                    old_type = channel["type"]
                    channel["type"] = suggestion[0]
                    issues.append(f"Fixed type '{old_type}' → '{suggestion[0]}'")
                    print(f"{GREEN}  🔧 Fixed type: '{old_type}' → '{suggestion[0]}'{RESET}")
                else:
                    issues.append(f"{RED}Invalid type: {channel['type']}{RESET}")
            else:
                issues.append(f"{RED}Invalid type: {channel['type']}{RESET}")
        else:
            print(f"  {GREEN}✔ Valid type: {channel['type']}{RESET}")

    # Validate permissionKey (auto-fix supported)
    if "permissionKey" in channel:
        value = channel["permissionKey"]
        if value not in valid_permission_keys:
            suggestion = difflib.get_close_matches(value, valid_permission_keys, n=1, cutoff=0.7)
            if suggestion:
                print(f"{YELLOW}⚠ Unknown permissionKey '{value}' — did you mean '{suggestion[0]}'?{RESET}")
                answer = input("  💡 Autofix it? (Y/n): ").strip().lower()
                if answer in ["y", "yes", ""]:
                    channel["permissionKey"] = suggestion[0]
                    issues.append(f"Fixed permissionKey '{value}' → '{suggestion[0]}'")
                    print(f"{GREEN}  🔧 Fixed permissionKey: '{value}' → '{suggestion[0]}'{RESET}")
                else:
                    issues.append(f"{RED}Unknown permissionKey: {value} (suggested: {suggestion[0]}){RESET}")
            else:
                issues.append(f"{RED}Unknown permissionKey: {value}{RESET}")
        else:
            print(f"  {GREEN}✔ Valid permissionKey: {channel['permissionKey']}{RESET}")

    # Validate role(s) including auto-fix for nested keys
    if "role" in channel:
        print("  ↪ Validating role...")
        roles = channel["role"] if isinstance(channel["role"], list) else [channel["role"]]
        for i, role in enumerate(roles):
            for role_key in list(role.keys()):
                if role_key not in valid_role_fields:
                    suggestion = suggest_key(role_key, valid_role_fields)
                    if suggestion:
                        print(f"{YELLOW}⚠ Unrecognized role key '{role_key}' — did you mean '{suggestion}'?{RESET}")
                        answer = input("  💡 Autofix it? (Y/n): ").strip().lower()
                        if answer in ["y", "yes", ""]:
                            role[suggestion] = role.pop(role_key)
                            issues.append(f"Fixed role key '{role_key}' → '{suggestion}'")
                            print(f"    {GREEN}🔧 Fixed role key: '{role_key}' → '{suggestion}'{RESET}")
                        else:
                            issues.append(f"{YELLOW}Role #{i+1} unrecognized key '{role_key}', suggested: '{suggestion}'{RESET}")
                    else:
                        issues.append(f"{YELLOW}Role #{i+1} unknown key '{role_key}'{RESET}")
            missing = valid_role_fields - role.keys()
            if missing:
                issues.append(f"{YELLOW}Role #{i+1} missing: {missing}{RESET}")
            else:
                print(f"    {GREEN}✔ Role #{i+1} is valid.{RESET}")

    # Validate webhook(s) including auto-fix for nested keys
    if "webhook" in channel:
        print("  ↪ Validating webhook...")
        webhook = channel["webhook"]
        for wh_key in list(webhook.keys()):
            if wh_key not in valid_webhook_fields:
                suggestion = suggest_key(wh_key, valid_webhook_fields)
                if suggestion:
                    print(f"{YELLOW}⚠ Unrecognized webhook key '{wh_key}' — did you mean '{suggestion}'?{RESET}")
                    answer = input("  💡 Autofix it? (Y/n): ").strip().lower()
                    if answer in ["y", "yes", ""]:
                        webhook[suggestion] = webhook.pop(wh_key)
                        issues.append(f"Fixed webhook key '{wh_key}' → '{suggestion}'")
                        print(f"    {GREEN}🔧 Fixed webhook key: '{wh_key}' → '{suggestion}'{RESET}")
                    else:
                        issues.append(f"{YELLOW}Webhook unrecognized key '{wh_key}', suggested: '{suggestion}'{RESET}")
                else:
                    issues.append(f"{YELLOW}Unknown webhook key '{wh_key}' is not expected.{RESET}")
        missing = valid_webhook_fields - webhook.keys()
        if missing:
            issues.append(f"{YELLOW}Webhook missing fields: {missing}{RESET}")
        else:
            print(f"    {GREEN}✔ Webhook is valid.{RESET}")

    # Validate messageKey
    if "messageKey" in channel:
        if channel["messageKey"] not in message_keys:
            issues.append(f"{RED}messageKey '{channel['messageKey']}' not found in channelMessages.json{RESET}")
        else:
            print(f"  {GREEN}✔ messageKey '{channel['messageKey']}' is valid.{RESET}")

    # Validate forumOptions for GuildForum channels
    if channel.get("type") == "GuildForum":
        print("  ↪ Validating forumOptions...")
        validate_forum(channel, issues)

    if not issues:
        print(f"  {GREEN}✅ Channel passed all checks.{RESET}\n")
        return None
    else:
        print(f"  {YELLOW}⚠ Issues found:{RESET}")
        for issue in issues:
            print(f"    {issue}")
        print()
        return {"path": path, "issues": issues}

# Counters for summary statistics
channels_count = 0
roles_count = 0
webhooks_count = 0
message_keys_count = 0
categories_count = 0
categories_with_channels = 0

results = []

# Validate noCategory channels
print(f"{BOLD}📂 Validating `noCategory` channels...{RESET}\n")
for ch in preset_data.get("noCategory", []):
    channels_count += 1
    if "role" in ch:
        roles_count += len(ch["role"]) if isinstance(ch["role"], list) else 1
    if "webhook" in ch:
        webhooks_count += 1
    if "messageKey" in ch:
        message_keys_count += 1
    res = validate_channel(ch, f"noCategory → {ch.get('name', ch.get('key', 'unknown'))}")
    if res:
        results.append(res)

# Validate categories and their channels
print(f"\n{BOLD}📂 Validating `categories`...{RESET}\n")
for cat in preset_data.get("categories", []):
    categories_count += 1
    cat_name = cat.get("name", "Unnamed Category")
    print(f"\n{BOLD}📁 Category:{RESET} {cat_name}")
    if cat.get("channels"):
        categories_with_channels += 1
    for ch in cat.get("channels", []):
        channels_count += 1
        if "role" in ch:
            roles_count += len(ch["role"]) if isinstance(ch["role"], list) else 1
        if "webhook" in ch:
            webhooks_count += 1
        if "messageKey" in ch:
            message_keys_count += 1
        res = validate_channel(ch, f"{cat_name} → {ch.get('name', ch.get('key', 'unknown'))}")
        if res:
            results.append(res)

# Summary of validation issues and counters
print(f"\n{BOLD}📊 Validation complete.{RESET}")
print(f"{GREEN}Total categories validated: {categories_count}{RESET}")
print(f"{GREEN}Categories with channels: {categories_with_channels}{RESET}")
print(f"{GREEN}Total channels validated: {channels_count}{RESET}")
print(f"{GREEN}Total roles validated: {roles_count}{RESET}")
print(f"{GREEN}Total webhooks validated: {webhooks_count}{RESET}")
print(f"{GREEN}Total message keys validated: {message_keys_count}{RESET}")

if not results:
    print(f"{GREEN}🎉 All channels passed validation!{RESET}")
else:
    print(f"{RED}❗ {len(results)} channel(s) have issues.{RESET}\n")
    print(f"{YELLOW}{BOLD}Detailed Issue Breakdown:{RESET}")
    for r in results:
        print(f"\n{CYAN}• {r['path']}{RESET}")
        for issue in r["issues"]:
            print(f"  {RED}- {issue}{RESET}")

# Ask to save changes if any auto-fixes were recorded in issues
fixes_applied = any("Fixed" in issue or "Unrecognized key" in issue for r in results for issue in r["issues"])

if fixes_applied:
    print(f"\n{YELLOW}🛠 Some fields were auto-corrected during validation.{RESET}")
    save_confirm = input(f"{BOLD}💾 Save changes to {PRESET_FILE}? (Y/n): {RESET}").strip().lower()
    if save_confirm in ["y", "yes", ""]:
        with preset_path.open("w", encoding="utf-8") as f:
            json.dump(preset_data, f, indent=2, ensure_ascii=False)
        print(f"{GREEN}✅ Updated preset saved to disk: {preset_path}{RESET}")
    else:
        print(f"{CYAN}⚠ Changes were NOT saved. Review them and rerun when ready.{RESET}")
