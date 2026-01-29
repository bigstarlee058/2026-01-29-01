#!/bin/bash

cd /Users/anastasia/Desktop/web-app-leonardo/src/pages

# Function to rename files in a directory
rename_files() {
    local dir="$1"
    local dirname=$(basename "$dir")
    
    # Check if index.jsx exists and rename it
    if [ -f "$dir/index.jsx" ]; then
        mv "$dir/index.jsx" "$dir/$dirname.jsx"
    fi
    
    # Check if index.module.scss exists and rename it
    if [ -f "$dir/index.module.scss" ]; then
        mv "$dir/index.module.scss" "$dir/$dirname.module.scss"
    fi
}

# Find all directories and process each one
find . -type d | while read -r dir; do
    if [ "$dir" != "." ]; then
        rename_files "$dir"
    fi
done
