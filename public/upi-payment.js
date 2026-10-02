window.renderUpiQr = function(containerId, amount) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = ` + '<div style="text-align: center; background: #ffffff; border: 2px solid #a80532; border-radius: 14px; padding: 16px; margin: 15px auto; max-width: 320px; box-shadow: 0 4px 15px rgba(168, 5, 50, 0.12);">
    <div style="background: #a80532; color: #ffffff; font-weight: bold; padding: 5px 12px; border-radius: 6px; font-size: 14px; display: inline-block; margin-bottom: 10px;">
        পাঞ্জাব ন্যাশনাল ব্যাংক (PNB)
    </div>
    <div style="font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 4px;">DWIPRAJ MALLICK</div>
    <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">Google Pay / PhonePe / Paytm দিয়ে স্ক্যান করুন</p>
    
    <div style="background: #fff; padding: 6px; border: 1px solid #e2e8f0; border-radius: 10px; display: inline-block;">
        <img src="/pnb-qr.jpg" alt="PNB QR" style="width: 200px; height: 200px; display: block;" />
    </div>

    <div style="margin-top: 10px; background: #fff5f6; border: 1px dashed #a80532; border-radius: 8px; padding: 8px 10px;">
        <div style="font-size: 13px; color: #475569;">
            UPI ID: <strong style="color: #0f172a; font-family: monospace; font-size: 14px;">dwiprajmallick@pnb</strong>
        </div>
    </div>
</div>' + `;
};

