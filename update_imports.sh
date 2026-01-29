#!/bin/bash

cd /Users/anastasia/Desktop/web-app-leonardo

# Find all .jsx and .tsx files that contain 'import' and potentially reference our renamed files
find . -type f \( -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" \) -exec grep -l "from.*index'" {} \;
