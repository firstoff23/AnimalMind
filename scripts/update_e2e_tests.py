import sys, re

def update_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'TEST_PREFIX' not in content:
            content = content.replace('APP_URL =', 'TEST_PREFIX = "AUTO_TEST_"\nAPP_URL =')
        
        content = content.replace('"Teste RLS"', 'f"{TEST_PREFIX}RLS"')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated', path)
    except Exception as e:
        print('Error', path, e)

update_file('.agents/test_animalmind.py')
update_file('.agents/test_e2e_final.py')
update_file('.agents/test_e2e_audio.py')
