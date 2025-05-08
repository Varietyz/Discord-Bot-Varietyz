import os
import re

def strip_comments_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Remove block comments
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)

    # Remove full-line comments
    code = re.sub(r'^\s*//.*$', '', code, flags=re.MULTILINE)

    # Remove trailing inline comments
    code = re.sub(r'(?<!:)//.*', '', code)

    # Remove JSON // lines
    if file_path.endswith('.json'):
        code = re.sub(r'^\s*//.*$', '', code, flags=re.MULTILINE)

    # Collapse extra newlines
    code = re.sub(r'\n\s*\n+', '\n\n', code)

    return code.strip() + '\n'

def mirror_backup_path(original_path, root_dir, backup_root):
    rel_path = os.path.relpath(original_path, root_dir)
    return os.path.join(backup_root, rel_path)

def clean_comments_with_backup_tree(root_dir, extensions=('.js', '.jsx', '.json')):
    backup_root = os.path.join(root_dir, '_backups')
    os.makedirs(backup_root, exist_ok=True)

    for subdir, _, files in os.walk(root_dir):
        if '_backups' in subdir or 'node_modules' in subdir:
            continue
        for file in files:
            if file.endswith(extensions):
                src_path = os.path.join(subdir, file)
                dst_path = mirror_backup_path(src_path, root_dir, backup_root)

                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                with open(src_path, 'r', encoding='utf-8') as src:
                    with open(dst_path, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())

                cleaned = strip_comments_from_file(src_path)
                with open(src_path, 'w', encoding='utf-8') as f:
                    f.write(cleaned)

                print(f'🧼 Cleaned: {src_path} → backup: {dst_path}')


if __name__ == '__main__':
    project_root = os.path.dirname(os.path.abspath(__file__))
    clean_comments_with_backup_tree(project_root)
