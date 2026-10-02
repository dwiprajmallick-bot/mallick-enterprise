(function() {
    function injectOfficialPnb() {
        const qrWrappers = document.querySelectorAll('div');
        qrWrappers.forEach(div => {
            if (div.innerText && div.innerText.includes('Scan with any UPI App') && !div.dataset.pnbDone) {
                div.dataset.pnbDone = 'true';
                div.innerHTML = `
                    <div style="text-align: center; padding: 12px; background: #ffffff; border: 2px solid #a80532; border-radius: 12px; margin: 10px auto; max-width: 280px; box-shadow: 0 4px 12px rgba(168,5,50,0.1);">
                        <div style="background: #a80532; color: #fff; font-weight: 700; font-size: 13px; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
                            PNB UPI PAYMENT
                        </div>
                        <div style="font-weight: bold; color: #1e293b; font-size: 15px; margin-bottom: 4px;">
                            DWIPRAJ MALLICK
                        </div>
                        <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">Google Pay / PhonePe / Paytm / BHIM</p>
                        
                        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; display: inline-block;">
                            <img src="/pnb-qr.jpg" alt="PNB Official QR" style="width: 210px; height: 210px; object-fit: contain; display: block;" onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=dwiprajmallick@pnb%26pn=DWIPRAJ%20MALLICK%26cu=INR';">
                        </div>

                        <div style="margin-top: 8px; font-size: 13px; color: #334155;">
                            UPI ID: <strong style="color: #a80532; font-family: monospace;">dwiprajmallick@pnb</strong>
                        </div>
                    </div>
                `;
            }
        });
    }

    setInterval(injectOfficialPnb, 300);
    document.addEventListener('DOMContentLoaded', injectOfficialPnb);
})();
