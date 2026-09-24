/* ==================================================
   10. CONFIGURATION — change ONLY these values to
   create a new job advertisement. Nothing else in the
   HTML/CSS needs to be touched.
   ================================================== */
const jobAd = {
  // Local path or remote URL — both work
  backgroundImage: "https://www.herzing.edu/sites/default/files/styles/fp_900_700/public/2021-08/it-support-technician_0.jpg.webp?h=4cd27b3f&itok=QBTPKgnU",

  // Company logo shown in the circular badge
  companyLogo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdppuBL36q5f3jeD1Ttr4X1pcNbyvzwZPRUMIVVW1VXgQ6Ah3SSQ725dXB&s=10",

  // Your platform's own logo, top-left. Leave empty ("") to use the
  // text fallback defined in the HTML (#jobadBrandFallback).
  brandLogo: "https://www.gamhubjobs.com/favicon.png",

  jobTitle: "Fiber Engineer",

  ctaText: "APPLY NOW",
  applyUrl: "https://example.com/apply"
};

/* ================================================== */
/*  Rendering logic — no need to edit below this line  */
/* ================================================== */
document.getElementById('jobadPhoto').src = jobAd.backgroundImage;
document.getElementById('jobadCompanyLogo').src = jobAd.companyLogo;
document.getElementById('jobadTitle').textContent = jobAd.jobTitle;
document.getElementById('jobadCta').textContent = jobAd.ctaText;
document.getElementById('jobadCta').href = jobAd.applyUrl;

const brandImg = document.getElementById('jobadBrandImg');
const brandFallback = document.getElementById('jobadBrandFallback');
if (jobAd.brandLogo) {
  brandImg.src = jobAd.brandLogo;
  brandImg.style.display = 'block';
  brandFallback.style.display = 'none';
  brandImg.onerror = function () {
    brandImg.style.display = 'none';
    brandFallback.style.display = 'block';
  };
}
