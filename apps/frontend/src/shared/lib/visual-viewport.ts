if (typeof window !== 'undefined' && window.visualViewport) {
	const viewport = window.visualViewport;
	const rootStyle = document.documentElement.style;

	let previousHeight = viewport.height;

	const update = () => {
		if (viewport.height !== previousHeight) {
			rootStyle.setProperty('--visual-viewport-duration', viewport.height < previousHeight ? '0.1s' : '0s');
			previousHeight = viewport.height;
		}

		rootStyle.setProperty('--visual-viewport-top', `${viewport.offsetTop}px`);
		rootStyle.setProperty('--visual-viewport-height', `${viewport.height}px`);
	};

	update();
	viewport.addEventListener('resize', update);
	viewport.addEventListener('scroll', update);
}
