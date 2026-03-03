from flask import Flask, render_template, request, redirect, url_for, session
from datetime import datetime, timedelta
import uuid
import os
from supabase import create_client, Client

app = Flask(__name__)
app.secret_key = 'rich_secret_key_1337'

# Supabase Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://kvtxxxmzgblaliwlkxhz.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_g8UPMvSYclO0DmW0rN1Q4g_VtAxBfuh")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.context_processor
def inject_user():
    if 'user' in session:
        try:
            response = supabase.table('users').select('*').eq('username', session['user']).execute()
            user = response.data[0] if response.data else None
            if user:
                # Check subscription status
                expiry = datetime.strptime(user['expiry_date'], "%Y-%m-%d %H:%M")
                is_subscribed = expiry > datetime.now()
                
                return dict(
                    is_logged_in=True, 
                    current_user=user, 
                    is_subscribed=is_subscribed,
                    loader_url="https://www.dropbox.com/scl/fi/zhpsb4wxzrkg7jt8aama5/loader.exe?rlkey=e0l1qeqckizv2uswrsaaf4wp0&st=k6gbb3ut&dl=1"
                )
        except Exception as e:
            print(f"Context processor error: {e}")
    return dict(is_logged_in=False, current_user=None, is_subscribed=False)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        response = supabase.table('users').select('*').eq('username', username).execute()
        user = response.data[0] if response.data else None
        
        if user and user['password'] == password:
            session['user'] = username
            return redirect(url_for('index'))
    return render_template('auth.html', mode='login')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    if not data:
        return {"success": False, "message": "No data received"}, 400
        
    username = data.get('username')
    password = data.get('password')
    
    try:
        response = supabase.table('users').select('*').eq('username', username).execute()
        user = response.data[0] if response.data else None
        
        if user and user['password'] == password:
            # Check subscription status
            expiry = datetime.strptime(user['expiry_date'], "%Y-%m-%d %H:%M")
            is_subscribed = expiry > datetime.now()
            
            # Prepare data and match what loader expects
            res_data = {
                "username": user['username'],
                "uid": user['uid'],
                "expiry_date": user['expiry_date'],
                "subscription": "VIP" if is_subscribed else "EXPIRED"
            }
            return {"success": True, "user": res_data}
        else:
            return {"success": False, "message": "Invalid credentials"}
    except Exception as e:
        print(f"API Login error: {e}")
        return {"success": False, "message": "Database error"}, 500

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        try:
            # Check if user exists
            existing = supabase.table('users').select('username').eq('username', username).execute()
            if existing.data:
                return "Username already exists!", 400
                
            # 7-day trial calculation
            now = datetime.now()
            expiry = now + timedelta(days=7)
            
            # Use count for UID simulation
            count_res = supabase.table('users').select('id', count='exact').execute()
            count = count_res.count if count_res.count is not None else 0
            
            user_data = {
                "username": username,
                "password": password,
                "uid": count + 1,
                "hwid": None, # HWID is bound on first loader login
                "registered_at": now.strftime("%Y-%m-%d"),
                "expiry_date": expiry.strftime("%Y-%m-%d %H:%M")
            }
            
            supabase.table('users').insert(user_data).execute()
            session['user'] = username
            return redirect(url_for('index'))
            
        except Exception as e:
            print(f"Register error: {e}")
            return "Registration error", 500
            
    return render_template('auth.html', mode='register')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

@app.route('/buy')
def buy():
    return render_template('buy.html')

@app.route('/generate_trial_key', methods=['POST'])
def generate_trial_key():
    if 'user' not in session:
        return redirect(url_for('login'))
        
    try:
        user_key = f"AWETOS-{str(uuid.uuid4())[:8].upper()}-90D"
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        key_data = {
            "key_value": user_key,
            "duration_days": 90,
            "created_at": now
        }
        
        supabase.table('keys').insert(key_data).execute()
        return redirect(url_for('buy', generated_key=user_key))
    except Exception as e:
        print(f"Error generating key: {e}")
        return redirect(url_for('buy', error="Database error. Please try again later."))

@app.route('/redeem_key', methods=['POST'])
def redeem_key():
    if 'user' not in session:
        return redirect(url_for('login'))
        
    key_input = request.form.get('key', '').strip()
    if not key_input:
        return redirect(url_for('information', error="No key provided"))
        
    try:
        # Check if key exists and is not used
        res_key = supabase.table('keys').select('*').eq('key_value', key_input).eq('used', False).execute()
        key_record = res_key.data[0] if res_key.data else None
        
        if key_record:
            res_user = supabase.table('users').select('*').eq('username', session['user']).execute()
            user = res_user.data[0] if res_user.data else None
            
            if not user: return redirect(url_for('information', error="User not found"))

            # Update user expiry date
            current_expiry = datetime.strptime(user['expiry_date'], "%Y-%m-%d %H:%M")
            if current_expiry < datetime.now():
                current_expiry = datetime.now()
                
            new_expiry = current_expiry + timedelta(days=key_record['duration_days'])
            
            # Mark key as used
            supabase.table('keys').update({
                "used": True,
                "used_by": session['user']
            }).eq('id', key_record['id']).execute()
            
            # Update user
            supabase.table('users').update({
                "expiry_date": new_expiry.strftime("%Y-%m-%d %H:%M")
            }).eq('id', user['id']).execute()
            
            return redirect(url_for('information', success=f"Successfully redeemed {key_record['duration_days']} days!"))
        else:
            return redirect(url_for('information', error="Invalid or already used key"))
    except Exception as e:
        print(f"Redeem error: {e}")
        return redirect(url_for('information', error="Database error"))

@app.route('/information')
def information():
    if 'user' not in session: return redirect(url_for('login'))
    
    try:
        response = supabase.table('users').select('*').eq('username', session['user']).execute()
        user_data = response.data[0] if response.data else None
        
        error = request.args.get('error')
        success = request.args.get('success')
        
        return render_template('info.html', user=user_data, error=error, success=success)
    except Exception as e:
        print(f"Information route error: {e}")
        return redirect(url_for('index'))

@app.route('/loader')
def loader_ui():
    # Only allow access if it looks like it's coming from the loader app
    # (Simplified security: checking if it's an Eel-capable context is done via script)
    return render_template('loader.html')

@app.route('/api/loader_version')
def loader_version():
    return {
        "version": "1.1.0",
        "download_url": "https://www.dropbox.com/scl/fi/zhpsb4wxzrkg7jt8aama5/loader.exe?rlkey=e0l1qeqckizv2uswrsaaf4wp0&st=k6gbb3ut&dl=1",
        "changelog": "Cyber-Glow v2: Premium UI Redesign & Standalone Portability!"
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
