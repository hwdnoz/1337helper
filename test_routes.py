from app import app

print("Registered routes:")
for rule in app.url_map.iter_rules():
    if 'prompt' in str(rule):
        print(f"  {rule} -> {rule.endpoint}")
