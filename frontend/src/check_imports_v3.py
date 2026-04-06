import os
import re

def check_use_effect_thorough(directory):
    files_with_usage = []
    
    usage_pattern = re.compile(r'\buseEffect\b')
    react_pattern = re.compile(r'\bReact\.useEffect\b')
    
    for root, dirs, files in os.walk(directory):
        if any(skip in root for skip in ['node_modules', 'dist', 'build', '.git']):
            continue
            
        for file in files:
            if file.endswith(('.jsx', '.js', '.ts', '.tsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        content = "".join(lines)
                        
                        has_usage = bool(usage_pattern.search(content))
                        has_react_usage = bool(react_pattern.search(content))
                        
                        # Has useEffect but no import containing useEffect
                        if has_usage and not has_react_usage:
                            has_import = any('useEffect' in line and 'import' in line for line in lines)
                            if not has_import:
                                files_with_usage.append(filepath)
                                
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
                    
    return files_with_usage

if __name__ == "__main__":
    src_dir = r"d:\Aura\frontend\src"
    errors = check_use_effect_thorough(src_dir)
    
    if errors:
        print("FILES WITH useEffect POTENTIAL ERRORS:")
        for e in errors:
            print(e)
    else:
        print("No files found with missing useEffect imports.")
