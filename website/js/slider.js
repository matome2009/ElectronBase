// Screenshot slider
(function () {
  const TOTAL = 10;
  const BASE_JA = 'https://firebasestorage.googleapis.com/v0/b/token-batch-transfer.firebasestorage.app/o/img%2Fja%2F';
  const TOKEN_JA = '16fe30a9-b7f0-4ebf-ad2c-b89b78886341';
  const BASE_EN = 'https://firebasestorage.googleapis.com/v0/b/token-batch-transfer.firebasestorage.app/o/img%2Fen%2F';
  const TOKEN_EN = '841dd994-e518-4a27-88b2-1f5a580ac0e5';

  const wrapper = document.getElementById('sliderWrapper');
  const dotsContainer = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');
  if (!wrapper) return;

  let currentSlide = 0;
  let autoTimer = null;

  function getImageUrl(index) {
    const lang = document.documentElement.lang || 'en';
    if (lang === 'ja') {
      return BASE_JA + (index + 1) + '.png?alt=media&token=' + TOKEN_JA;
    }
    return BASE_EN + (index + 1) + '.png?alt=media&token=' + TOKEN_EN;
  }

  function buildSlider() {
    wrapper.innerHTML = '';
    dotsContainer.innerHTML = '';
    for (var i = 0; i < TOTAL; i++) {
      var img = document.createElement('img');
      img.className = 'slider-image' + (i === 0 ? ' active' : '');
      img.src = getImageUrl(i);
      img.alt = 'Screenshot ' + (i + 1);
      img.loading = i === 0 ? 'eager' : 'lazy';
      wrapper.appendChild(img);

      var dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('data-index', i);
      dotsContainer.appendChild(dot);
    }
    currentSlide = 0;
  }

  function goToSlide(n) {
    var images = wrapper.querySelectorAll('.slider-image');
    var dots = dotsContainer.querySelectorAll('.slider-dot');
    if (!images.length) return;
    images[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = ((n % TOTAL) + TOTAL) % TOTAL;
    images[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function resetAutoSlide() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(function () { goToSlide(currentSlide + 1); }, 5000);
  }

  prevBtn.addEventListener('click', function () { goToSlide(currentSlide - 1); resetAutoSlide(); });
  nextBtn.addEventListener('click', function () { goToSlide(currentSlide + 1); resetAutoSlide(); });
  dotsContainer.addEventListener('click', function (e) {
    var idx = e.target.getAttribute('data-index');
    if (idx !== null) { goToSlide(parseInt(idx, 10)); resetAutoSlide(); }
  });

  // Build on load & rebuild on language change
  buildSlider();
  resetAutoSlide();

  // Watch for language changes (html lang attribute)
  var observer = new MutationObserver(function () { buildSlider(); resetAutoSlide(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
