import os
import re

def check_use_effect_imports(directory):
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, dist, and build
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist', 'build']]
        for file in files:
            if file.endswith(('.js', '.jsx')):
                path = os.path.join(root, file)
                if 'check_imports.py' in path: continue
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'useEffect' in content:
                        # Improved regex to handle React, { useEffect } and { useEffect }
                        import_pattern = r'import\s+.*{.*useEffect.*}\s+from\s+[\'"]react[\'"]'
                        import_match = re.search(import_pattern, content)
                        if not import_match:
                            print(f'MISMATCH: {path}')

check_use_effect_imports('.')
