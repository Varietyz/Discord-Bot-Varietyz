import re


def beautify_readme(input_text):
    """Reformat and beautify the README content."""

    # Split the content into lines
    lines = input_text.splitlines()

    beautified_lines = []
    prev_line_blank = False

    for line in lines:
        # Handle headings - ensure proper space after # symbols
        line = re.sub(r'^(#+)\s*', r'\1 ', line.strip())

        # Convert HTML tags in headings/lists to Markdown (e.g., <dl>, <dt>, <dd>)
        if line.startswith('<dt>'):
            # Convert <dt> to Markdown list format
            line = re.sub(r'<dt><a href="([^"]+)">([^<]+)</a></dt>', r'- [\2](\1)', line)
        elif line.startswith('<dd>'):
            # Indent <dd> content for better readability
            line = re.sub(r'<dd>(.+)</dd>', r'    \1', line)

        # Remove unnecessary HTML tags
        line = re.sub(r'</?(dl|a)>', '', line)

        # Ensure there's only one blank line between sections
        if line.strip() == '':
            if not prev_line_blank:
                beautified_lines.append('')
            prev_line_blank = True
        else:
            beautified_lines.append(line)
            prev_line_blank = False

    # Join the beautified lines with newlines
    beautified_text = '\n'.join(beautified_lines).strip()

    return beautified_text


# File paths
input_file = 'Gen_README.md'
output_file = 'README_BEAUTIFIED.md'

try:
    # Read the input README file
    with open(input_file, 'r', encoding='utf-8') as file:
        readme_content = file.read()

    # Beautify the README content
    beautified_readme = beautify_readme(readme_content)

    # Write the beautified content to a new file
    with open(output_file, 'w', encoding='utf-8') as file:
        file.write(beautified_readme)

    print(f"Beautified README saved to {output_file}")

except FileNotFoundError:
    print(f"Error: The file {input_file} does not exist.")
except Exception as e:
    print(f"An error occurred: {e}")
