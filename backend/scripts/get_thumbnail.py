import instaloader
import sys
import json
import re
import os
import requests

def extract_shortcode(url):
    # Matches /reel/abcde, /reels/abcde, /p/abcde, /tv/abcde, /share/reel/abcde
    pattern = r'/(?:reels?|p|tv|share/reel)/([A-Za-z0-9_-]+)'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    
    # Fallback if the user input is just the shortcode itself
    clean_url = url.strip().split('?')[0].strip('/')
    if '/' not in clean_url and len(clean_url) > 0:
        return clean_url
    return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL or shortcode provided"}), file=sys.stderr)
        sys.exit(1)
        
    reel_url = sys.argv[1]
    shortcode = extract_shortcode(reel_url)
    
    if not shortcode:
        print(json.dumps({"error": f"Could not parse shortcode from URL: {reel_url}"}), file=sys.stderr)
        sys.exit(1)
        
    # Define target directory for thumbnails (supports env override or frontend/public/thumbnails in monorepo)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_dir = os.environ.get('THUMBNAIL_DIR') or os.environ.get('THUMBNAILS_DIR')
    if env_dir:
        target_dir = os.path.abspath(env_dir)
    else:
        monorepo_dir = os.path.abspath(os.path.join(script_dir, '..', '..', 'frontend', 'public', 'thumbnails'))
        legacy_dir = os.path.abspath(os.path.join(script_dir, '..', 'public', 'thumbnails'))
        target_dir = monorepo_dir if os.path.exists(os.path.dirname(monorepo_dir)) else legacy_dir
    os.makedirs(target_dir, exist_ok=True)
    
    target_filename = f"{shortcode}.jpg"
    target_path = os.path.join(target_dir, target_filename)
    meta_filename = f"{shortcode}.json"
    meta_path = os.path.join(target_dir, meta_filename)
    local_url = f"/thumbnails/{target_filename}"
    
    # If the file already exists locally, return it immediately to save requests
    if os.path.exists(target_path) and os.path.exists(meta_path):
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta_data = json.load(f)
            result = {
                "username": meta_data.get("username", "instagram_user"),
                "caption": meta_data.get("caption", ""),
                "thumbnail_url": local_url,
                "shortcode": shortcode,
                "cached": True
            }
            print(json.dumps(result))
            sys.exit(0)
        except Exception:
            pass # fallback to full download if json fails
        
    L = instaloader.Instaloader()
    
    # Optional login to Instagram if credentials are provided in the environment
    ig_user = os.environ.get('INSTAGRAM_USER') or os.environ.get('VITE_INSTAGRAM_USER')
    ig_password = os.environ.get('INSTAGRAM_PASSWORD') or os.environ.get('VITE_INSTAGRAM_PASSWORD')
    ig_browser = os.environ.get('INSTAGRAM_BROWSER') or os.environ.get('VITE_INSTAGRAM_BROWSER')
    
    if ig_browser:
        try:
            import browser_cookie3
            browser_name = ig_browser.lower().strip()
            
            # Load cookies based on the browser name
            if browser_name == 'chrome':
                cookies = browser_cookie3.chrome(domain_name="instagram.com")
            elif browser_name == 'firefox':
                cookies = browser_cookie3.firefox(domain_name="instagram.com")
            elif browser_name == 'edge':
                cookies = browser_cookie3.edge(domain_name="instagram.com")
            elif browser_name == 'opera':
                cookies = browser_cookie3.opera(domain_name="instagram.com")
            elif browser_name == 'brave':
                cookies = browser_cookie3.brave(domain_name="instagram.com")
            elif browser_name == 'safari':
                cookies = browser_cookie3.safari(domain_name="instagram.com")
            else:
                # fallback/generic load
                cookies = browser_cookie3.load(domain_name="instagram.com")
                
            L.context.update_cookies(cookies)
            print(f"[Scraper] Successfully loaded Instagram cookies from {browser_name}", file=sys.stderr)
        except Exception as cookie_err:
            print(f"[Warning] Instaloader failed to load cookies from {ig_browser}: {cookie_err}", file=sys.stderr)
            
    if not ig_browser and ig_user:
        try:
            L.load_session_from_file(ig_user)
        except Exception:
            if ig_password:
                try:
                    L.login(ig_user, ig_password)
                    L.save_session_to_file()
                except Exception as login_err:
                    print(f"[Warning] Instaloader login failed: {login_err}", file=sys.stderr)
    
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        
        # FIX: Changed post.url (HTML page) to post.date_url (Direct Image CDN link)
        image_cdn_url = post.date_url 
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        img_response = requests.get(image_cdn_url, headers=headers, timeout=15)
        if img_response.status_code == 200:
            with open(target_path, 'wb') as f:
                f.write(img_response.content)
        else:
            raise Exception(f"Failed to download image from CDN: HTTP {img_response.status_code}")
            
        # Write metadata JSON file
        meta_data = {
            "username": post.owner_username,
            "caption": post.caption or ""
        }
        try:
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(meta_data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        result = {
            "username": post.owner_username,
            "caption": post.caption or "",
            "thumbnail_url": local_url,
            "shortcode": shortcode,
            "cached": False
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()