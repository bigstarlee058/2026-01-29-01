#!/bin/bash

cd /Users/anastasia/Desktop/web-app-leonardo/src

# Function to process a file
process_file() {
    local file="$1"
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Process the file and write to temp file
    while IFS= read -r line; do
        # Check if line contains an import from an index file
        if [[ $line =~ from[[:space:]]*[\'"](\.{1,2}/.+)/index[\'"]\; ]]; then
            # Get the path and construct new import
            path="${BASH_REMATCH[1]}"
            dir_name=$(basename "$path")
            # Replace 'from "./path/index"' with 'from "./path/DirName"'
            echo "$line" | sed "s|from[[:space:]]*['\"]\\(${path}\\)/index['\"]|from '\\1/${dir_name}'|" >> "$temp_file"
        else
            echo "$line" >> "$temp_file"
        fi
    done < "$file"
    
    # Replace original file with processed file
    mv "$temp_file" "$file"
}

# Find all JavaScript/TypeScript files and process them
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    process_file "$file"
done

# Update style imports
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|/index.module.scss|/'"$(basename "$(dirname "{}")")"'.module.scss|g' {} \;
