(function() {
    const checkAuth = async () => {
        let adminKey = sessionStorage.getItem('adminToken');
        if (!adminKey) {
            const pass = prompt('🔒 সিকিউরিটি সতর্কতা:\nগ্রাহকদের সংবেদনশীল তথ্য দেখতে অ্যাডমিন পাসওয়ার্ড লিখুন:');
            if (!pass) {
                alert('অনুমোদন ছাড়া এই পেজ দেখা যাবে না!');
                window.location.href = '/';
                return;
            }
            try {
                const res = await fetch('/api/admin/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('adminToken', pass);
                    window.location.reload();
                } else {
                    alert('ভুল পাসওয়ার্ড! গ্রাহকের ডেটা সুরক্ষিত রাখা হয়েছে।');
                    window.location.href = '/';
                }
            } catch(e) {
                window.location.href = '/';
            }
        }
    };
    checkAuth();
})();
