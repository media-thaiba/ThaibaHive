import os
import re
import shutil
import sqlite3

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(base_dir, 'dev.db')
pubspec_path = os.path.join(base_dir, 'thaibahive_mobile_app', 'pubspec.yaml')
public_dir = os.path.join(base_dir, 'public')
downloads_dir = os.path.join(public_dir, 'downloads')

print('=== Starting Local OTA Update Seeding (Python) ===')

# 1. Get current version from pubspec.yaml
version = '1.0.0+3' # Fallback
if os.path.exists(pubspec_path):
    with open(pubspec_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.search(r'^version:\s*([^\s]+)', content, re.MULTILINE)
    if match:
        version = match.group(1)
        print(f'[Info] Parsed version from pubspec.yaml: {version}')
    else:
        print('[Warning] Could not parse version from pubspec.yaml. Using fallback.')
else:
    print('[Warning] pubspec.yaml not found. Using fallback version.')

clean_version = version.replace('+', '_')
apk_name = f'ThaibaHive_V{clean_version}.apk'
apk_source_path = os.path.join(base_dir, apk_name)

# Fallback search in outputs if root APK is missing
final_source = apk_source_path
if not os.path.exists(apk_source_path):
    build_apk_path = os.path.join(base_dir, 'thaibahive_mobile_app', 'build', 'app', 'outputs', 'flutter-apk', 'app-arm64-v8a-release.apk')
    if os.path.exists(build_apk_path):
        final_source = build_apk_path
        print('[Info] Found APK in build outputs directory.')
    else:
        print(f'[Error] APK file not found at {apk_source_path} or {build_apk_path}!')
        print('Please run a Flutter build first.')
        exit(1)

# 2. Ensure downloads directory exists
if not os.path.exists(downloads_dir):
    os.makedirs(downloads_dir, exist_ok=True)
    print(f'[Info] Created downloads directory at: {downloads_dir}')

# 3. Copy APK to public static server path & root directory
target_latest_path = os.path.join(downloads_dir, 'ThaibaHive_latest.apk')
target_versioned_path = os.path.join(downloads_dir, apk_name)
root_versioned_path = os.path.join(base_dir, apk_name)

try:
    shutil.copyfile(final_source, target_latest_path)
    shutil.copyfile(final_source, target_versioned_path)
    if final_source != root_versioned_path:
        shutil.copyfile(final_source, root_versioned_path)
    print(f'[Success] Copied APK to downloads: {target_latest_path} and {target_versioned_path}')
except Exception as e:
    print('[Error] Failed to copy APK:', e)
    exit(1)

# 4. Update local SQLite DB configuration using native sqlite3
if not os.path.exists(db_path):
    print(f'[Error] Local SQLite database not found at {db_path}!')
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    print(f'[Info] Connected to SQLite database at: {db_path}')

    configs = [
        ('app_latest_version', version),
        ('app_download_url', '/downloads/ThaibaHive_latest.apk'),
        ('app_release_notes', 'Stable build containing NFC coordinates tracking and JWT silent refresh authentication.'),
        ('app_force_update', 'false')
    ]

    for key, value in configs:
        cursor.execute('''
            INSERT INTO system_configs (key, value)
            VALUES (?, ?)
            ON CONFLICT(key)
            DO UPDATE SET value = excluded.value
        ''', (key, value))
        print(f'[DB] Updated configuration key \'{key}\' = \'{value}\'')

    conn.commit()
    conn.close()
    print('[Success] SQLite system configurations updated successfully!')
    print('=== OTA Update Configuration Completed ===')
except Exception as e:
    print('[Error] Failed to update local database:', e)
    exit(1)
