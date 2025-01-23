import os

def save_tree_structure(start_path, exclude_entries=None, output_file="folder_structure.txt"):
    if exclude_entries is None:
        exclude_entries = [
            ".env", ".git", ".gitattributes", ".gitignore", ".vscode",
            "export_structure.py", "folder_structure.txt", "logs",
            "node_modules", "package-lock.json", "prompts", "docs"
        ]

    def walk_directory(directory, depth=0, prefix=""):
        # Skip excluded directories and files
        if any(excluded in directory for excluded in exclude_entries):
            return []

        # List for storing the current directory structure
        tree_lines = []
        entries = os.listdir(directory)
        entries = [entry for entry in entries if entry not in exclude_entries]  # Filter exclusions
        total_entries = len(entries)

        for idx, entry in enumerate(entries):
            full_path = os.path.join(directory, entry)
            is_last = idx == total_entries - 1  # Check if this is the last entry in the list
            symbol = "└─" if is_last else "├─"
            new_prefix = prefix + ("    " if is_last else "│   ")

            if os.path.isdir(full_path):  # If directory, recurse
                emoji = "📂"
                tree_lines.append(f"{prefix}{symbol} {emoji} {entry}")
                tree_lines.extend(walk_directory(full_path, depth + 1, new_prefix))
            else:  # If file, add to tree
                emoji = "📄"
                tree_lines.append(f"{prefix}{symbol} {emoji} {entry}")
        return tree_lines

    # Start by walking the directory from the current folder
    directory_structure = walk_directory(start_path)

    # Write the structure to the output file using UTF-8 encoding
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(directory_structure))

    print(f"Folder structure has been saved to {output_file}")


if __name__ == "__main__":
    current_directory = os.getcwd()
    save_tree_structure(current_directory)
