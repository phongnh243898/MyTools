// VideoManager.js
// verson: 1.0.29012026

class videoManager {
	constructor(videoWrap) {
		this.videoWrap = videoWrap;
		this.zoom = 1;
		this.pan = { x: 0, y: 0 };
		this.videoElement = null;
		this.isResizing = false;
		this.resizeHandle = null;
		this.lastMouseX = 0;
		this.lastMouseY = 0;
		this.isPanning = false;
	}

	initVideoElement() {
		// Kiểm tra và tạo thẻ #video3d nếu chưa có
		let video3d = document.getElementById('video3d');
		if (!video3d) {
			video3d = document.createElement('div');
			video3d.id = 'video3d';
			video3d.style.position = 'absolute';
			video3d.style.bottom = '0';
			video3d.style.left = '0';
			video3d.style.width = '120px';
			video3d.style.height = '120px';
			video3d.style.border = '2px solid #ccc';
			video3d.style.backgroundColor = '#f0f0f0';
			this.videoWrap.appendChild(video3d);
		}

		// Thêm điều khiển resize 4 cạnh cho #video3d
		this.addResizeHandles(video3d);

		// Thiết lập zoom và pan cho thẻ video bên trong #video3d
		this.setupZoomPan(video3d);
	}

	addResizeHandles(container) {
		container.style.resize = 'none'; // Tắt resize mặc định

		// Tạo handles cho 4 cạnh và 4 góc
		const handles = ['top', 'right', 'top-right'];
		handles.forEach(handle => {
			const resizeHandle = document.createElement('div');
			resizeHandle.className = `resize-handle ${handle}`;
			resizeHandle.style.position = 'absolute';
			resizeHandle.style.background = 'transparent';
			resizeHandle.style.cursor = this.getCursorStyle(handle);

			// Định vị handles
			switch (handle) {
				case 'top':
					resizeHandle.style.top = '-5px';
					resizeHandle.style.left = '0';
					resizeHandle.style.width = '100%';
					resizeHandle.style.height = '10px';
					break;
				case 'right':
					resizeHandle.style.top = '0';
					resizeHandle.style.right = '-5px';
					resizeHandle.style.width = '10px';
					resizeHandle.style.height = '100%';
					break;
				case 'bottom':
					resizeHandle.style.bottom = '-5px';
					resizeHandle.style.left = '0';
					resizeHandle.style.width = '100%';
					resizeHandle.style.height = '10px';
					break;
				case 'left':
					resizeHandle.style.top = '0';
					resizeHandle.style.left = '-5px';
					resizeHandle.style.width = '10px';
					resizeHandle.style.height = '100%';
					break;
				case 'top-left':
					resizeHandle.style.top = '-5px';
					resizeHandle.style.left = '-5px';
					resizeHandle.style.width = '10px';
					resizeHandle.style.height = '10px';
					break;
				case 'top-right':
					resizeHandle.style.top = '-5px';
					resizeHandle.style.right = '-5px';
					resizeHandle.style.width = '10px';
					resizeHandle.style.height = '10px';
					break;
				case 'bottom-left':
					resizeHandle.style.bottom = '-5px';
					resizeHandle.style.left = '-5px';
					resizeHandle.style.width = '10px';
					resizeHandle.style.height = '10px';
					break;
				case 'bottom-right':
					resizeHandle.style.bottom = '-5px';
					resizeHandle.style.right = '-5px';
					resizeHandle.style.width = '10px';
					resizeHandle.style.height = '10px';
					break;
			}

			resizeHandle.addEventListener('mousedown', (e) => {
				this.startResize(e, handle, container);
			});

			container.appendChild(resizeHandle);
		});

		// Ngăn chọn text khi resize
		document.addEventListener('selectstart', (e) => {
			if (this.isResizing) e.preventDefault();
		});
	}

	getCursorStyle(handle) {
		switch (handle) {
			case 'top':
			case 'bottom':
				return 'ns-resize';
			case 'left':
			case 'right':
				return 'ew-resize';
			case 'top-left':
			case 'bottom-right':
				return 'nw-resize';
			case 'top-right':
			case 'bottom-left':
				return 'ne-resize';
			default:
				return 'default';
		}
	}

	startResize(e, handle, container) {
		e.preventDefault();
		this.isResizing = true;
		this.resizeHandle = handle;
		this.lastMouseX = e.clientX;
		this.lastMouseY = e.clientY;

		document.addEventListener('mousemove', (e) => this.resize(e, container));
		document.addEventListener('mouseup', this.stopResize.bind(this));
	}

	resize(e, container) {
		if (!this.isResizing) return;

		const deltaX = e.clientX - this.lastMouseX;
		const deltaY = e.clientY - this.lastMouseY;
		const rect = container.getBoundingClientRect();
		const parentRect = this.videoWrap.getBoundingClientRect();

		let newLeft = rect.left - parentRect.left;
		let newTop = rect.top - parentRect.top;
		let newWidth = rect.width;
		let newHeight = rect.height;

		switch (this.resizeHandle) {
			case 'top':
				newTop += deltaY;
				newHeight -= deltaY;
				break;
			case 'right':
				newWidth += deltaX;
				break;
			case 'bottom':
				newHeight += deltaY;
				break;
			case 'left':
				newLeft += deltaX;
				newWidth -= deltaX;
				break;
			case 'top-left':
				newLeft += deltaX;
				newTop += deltaY;
				newWidth -= deltaX;
				newHeight -= deltaY;
				break;
			case 'top-right':
				newTop += deltaY;
				newWidth += deltaX;
				newHeight -= deltaY;
				break;
			case 'bottom-left':
				newLeft += deltaX;
				newWidth -= deltaX;
				newHeight += deltaY;
				break;
			case 'bottom-right':
				newWidth += deltaX;
				newHeight += deltaY;
				break;
		}

		// Giới hạn trong videoWrap
		newLeft = Math.max(0, Math.min(newLeft, parentRect.width - newWidth));
		newTop = Math.max(0, Math.min(newTop, parentRect.height - newHeight));
		newWidth = Math.max(50, Math.min(newWidth, parentRect.width - newLeft));
		newHeight = Math.max(50, Math.min(newHeight, parentRect.height - newTop));

		container.style.left = newLeft + 'px';
		container.style.top = newTop + 'px';
		container.style.width = newWidth + 'px';
		container.style.height = newHeight + 'px';

		this.lastMouseX = e.clientX;
		this.lastMouseY = e.clientY;
	}

	stopResize() {
		this.isResizing = false;
		this.resizeHandle = null;
		document.removeEventListener('mousemove', this.resize.bind(this));
		document.removeEventListener('mouseup', this.stopResize.bind(this));
	}

	setupZoomPan(container) {
		if (!this.videoElement) return;

		this.videoElement.style.transformOrigin = 'center center';
		container.addEventListener('wheel', this.handleZoom.bind(this));
		container.addEventListener('mousedown', this.startPan.bind(this));
		document.addEventListener('mousemove', this.pan.bind(this));
		document.addEventListener('mouseup', this.stopPan.bind(this));

		// Ngăn menu chuột phải
		container.addEventListener('contextmenu', (e) => e.preventDefault());
	}

	handleZoom(e) {
		e.preventDefault();
		const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
		this.zoom *= zoomFactor;
		this.zoom = Math.max(0.1, Math.min(5, this.zoom)); // Giới hạn zoom
		this.updateTransform();
	}

	startPan(e) {
		if (e.button !== 0) return; // Chỉ chuột trái
		e.preventDefault();
		this.isPanning = true;
		this.lastMouseX = e.clientX;
		this.lastMouseY = e.clientY;
		document.body.style.cursor = 'grabbing';
	}

	pan(e) {
		if (!this.isPanning) return;
		e.preventDefault();
		const deltaX = e.clientX - this.lastMouseX;
		const deltaY = e.clientY - this.lastMouseY;
		this.pan.x += deltaX;
		this.pan.y += deltaY;
		this.lastMouseX = e.clientX;
		this.lastMouseY = e.clientY;
		this.updateTransform();
	}

	stopPan() {
		this.isPanning = false;
		document.body.style.cursor = 'grab';
	}

	updateTransform() {
		if (this.videoElement) {
			this.videoElement.style.transform = `scale(${this.zoom}) translate(${this.pan.x / this.zoom}px, ${this.pan.y / this.zoom}px)`;
		}
	}

	load_video_from_file(file) {
		if (file && file.type.startsWith('video/')) {
			const videoSrc = URL.createObjectURL(file);
			this.createVideoElement(videoSrc);
		} else {
			console.error('Invalid file type. Please select a video file.');
		}
	}

	load_video_from_url(url) {
		if (url) {
			this.createVideoElement(url);
		} else {
			console.error('Invalid URL provided.');
		}
	}

	createVideoElement(src) {
		const video3d = document.getElementById('video3d');
		if (!video3d) return;

		// Xóa video cũ nếu có
		if (this.videoElement) {
			video3d.removeChild(this.videoElement);
		}

		this.videoElement = document.createElement('video');
		this.videoElement.src = src;
		this.videoElement.controls = true;
		this.videoElement.style.width = '100%';
		this.videoElement.style.height = '100%';
		this.videoElement.style.objectFit = 'contain';
		video3d.appendChild(this.videoElement);

		// Thiết lập zoom và pan
		this.setupZoomPan(video3d);
	}

	skipLeft() {
		if (this.videoElement) {
			const wasPlaying = !this.videoElement.paused;
			this.videoElement.currentTime = Math.max(0, this.videoElement.currentTime - 0.1);
			if (wasPlaying) {
				this.videoElement.play();
			}
		}
	}

	skipRight() {
		if (this.videoElement) {
			const wasPlaying = !this.videoElement.paused;
			this.videoElement.currentTime = Math.min(this.videoElement.duration, this.videoElement.currentTime + 0.1);
			if (wasPlaying) {
				this.videoElement.play();
			}
		}
	}

	play() {
		if (this.videoElement) {
			if (this.videoElement.paused) {
				this.videoElement.play();
			} else {
				this.videoElement.pause();
			}
		}
	}
}

const videowrap = document.querySelector("body");
const video = new videoManager(videowrap);
video.initVideoElement();
