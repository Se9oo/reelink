if (typeof window !== 'undefined' && window.visualViewport) {
	const viewport = window.visualViewport;
	const rootStyle = document.documentElement.style;

	const update = () => {
		rootStyle.setProperty('--visual-viewport-top', `${viewport.offsetTop}px`);
		rootStyle.setProperty('--visual-viewport-height', `${viewport.height}px`);
	};

	update();
	viewport.addEventListener('resize', update);
	viewport.addEventListener('scroll', update);
}
