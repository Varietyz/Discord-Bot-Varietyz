import os

def save_tree_structure(start_path, exclude_dirs=None, output_file="folder_structure.txt"):
    if exclude_dirs is None:
        exclude_dirs = ["node_modules", ".vscode"]

    def walk_directory(directory, depth=0, prefix=""):
        # Skip excluded directories
        if any(excluded in directory for excluded in exclude_dirs):
            return []

        # List for storing the current directory structure
        tree_lines = []
        entries = os.listdir(directory)
        total_entries = len(entries)

        for idx, entry in enumerate(entries):
            full_path = os.path.join(directory, entry)
            is_last = idx == total_entries - 1  # Check if this is the last entry in the list
            symbol = "└─" if is_last else "├─"
            new_prefix = prefix + ("    " if is_last else "│   ")

            if os.path.isdir(full_path):  # If directory, recurse
                tree_lines.append(f"{prefix}{symbol} [DIR] {entry}")
                tree_lines.extend(walk_directory(full_path, depth + 1, new_prefix))
            else:  # If file, add to tree
                tree_lines.append(f"{prefix}{symbol} [FILE] {entry}")
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
