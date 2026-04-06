import os
import re

def check_use_effect_imports(directory):
    files_with_errors = []
    
    # Compile regex for detecting use of useEffect (excluding comments/strings roughly)
    # Simple check for 'useEffect('
    usage_pattern = re.compile(r'\buseEffect\s*\(')
    # Check for 'import ... useEffect ... from "react"'
    import_pattern = re.compile(r'import\s+.*\{.*useEffect.*\}\s+from\s+[\'"]react[\'"]')
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, dist, etc.
        if any(skip in root for skip in ['node_modules', 'dist', 'build', '.git']):
            continue
            
        for file in files:
            if file.endswith(('.jsx', '.js', '.ts', '.tsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        has_usage = bool(usage_pattern.search(content))
                        has_import = bool(import_pattern.search(content))
                        
                        if has_usage and not has_import:
                            files_with_errors.append(filepath)
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
                    
    return files_with_errors

if __name__ == "__main__":
    src_dir = r"d:\Aura\frontend\src"
    errors = check_use_effect_imports(src_dir)
    
    if errors:
        print("FILES USING useEffect WITHOUT IMPORT:")
        for e in errors:
            print(e)
    else:
        print("No files found using useEffect without import.")
