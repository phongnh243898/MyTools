console.log("VideoManager.js version 1.00.29012026");

class VideoManager {
    constructor(videoContainer) {
        this.container = videoContainer;
        if (!this.container) throw new Error("Container element không tồn tại.");

        this.video = null;
        this.isFocused = false;

        this.transform = { scale: 1, x: 0, y: 0 };
        this.isPanning = false;
        this.startPan = { x: 0, y: 0 };

        this.initDom();
        this.initEvent();
        this.initResizeHandles();
    }

    initDom() {
        this.video = document.createElement('video');
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        this.video.style.objectFit = 'contain';
        this.video.style.pointerEvents = 'none';
        this.video.disablePictureInPicture = true;
        this.container.tabIndex = 0; 
        this.container.appendChild(this.video);
    }

    initEvent() {
        // Xử lý Focus/Blur
        this.container.addEventListener('focus', () => { this.isFocused = true; });
        this.container.addEventListener('blur', () => { 
            this.isFocused = false; 
            this.video.pause(); 
        });

        // Phím tắt điều khiển
        window.addEventListener('keydown', (e) => {
            if (!this.isFocused) return;
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.video.paused ? this.video.play() : this.video.pause();
                    break;
                case 'ArrowLeft':
                    this.video.currentTime -= 0.1;
                    break;
                case 'ArrowRight':
                    this.video.currentTime += 0.1;
                    break;
            }
        });

        // Zoom (Wheel)
        this.container.addEventListener('wheel', (e) => {
            if (!this.isFocused) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.transform.scale = Math.min(Math.max(0.5, this.transform.scale * delta), 5);
            this._apply_transform_();
        }, { passive: false });

        // Pan (Mouse Drag)
        this.container.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            this.isPanning = true;
            this.startPan = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
            this.container.style.cursor = 'grabbing';
        });

        this.container.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.transform.x = e.clientX - this.startPan.x;
            this.transform.y = e.clientY - this.startPan.y;
            this._apply_transform_();
        });

        this.container.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.container.style.cursor = 'default';
        });

        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

initResizeHandles() {
    const positions = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resizer ${pos}`;
        handle.style.position = 'absolute';
        switch (pos) {
            case 'n':
            case 's':
                handle.style.width = '100%';
                handle.style.height = '10px';
                handle.style.zIndex = '10';
                break;
            case 'e':
            case 'w':
                handle.style.width = '10px';
                handle.style.height = '100%';
                handle.style.zIndex = '10';
                break;
            case 'nw':
            case 'ne':
            case 'sw':
            case 'se':
                handle.style.width = '20px';
                handle.style.height = '20px';
                handle.style.zIndex = '11';
                break;
        }
        this._setHandlePosition(handle, pos);
        this.container.appendChild(handle);
        this._makeResizable(handle, pos);
    });
}

_setHandlePosition(el, pos) {
    const offset = '-5px';
    if (pos.includes('n')) el.style.top = offset;
    if (pos.includes('s')) el.style.bottom = offset;
    if (pos.includes('e')) el.style.right = offset;
    if (pos.includes('w')) el.style.left = offset;
    if (pos.length === 1) {
        if (pos === 'n' || pos === 's') {
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
        }
        if (pos === 'e' || pos === 'w') {
            el.style.top = '50%';
            el.style.transform = 'translateY(-50%)';
        }
    }
    const cursorMap = {
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
        nw: 'nwse-resize',
        se: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize'
    };
    el.style.cursor = cursorMap[pos];
}


    _makeResizable(handle, pos) {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startWidth = this.container.offsetWidth;
            const startHeight = this.container.offsetHeight;
            const startX = e.clientX;
            const startY = e.clientY;

            const onMouseMove = (moveEvent) => {
                if (pos.includes('e')) this.container.style.width = `${startWidth + (moveEvent.clientX - startX)}px`;
                if (pos.includes('w')) this.container.style.width = `${startWidth - (moveEvent.clientX - startX)}px`;
                if (pos.includes('s')) this.container.style.height = `${startHeight + (moveEvent.clientY - startY)}px`;
                if (pos.includes('n')) this.container.style.height = `${startHeight - (moveEvent.clientY - startY)}px`;
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    loadVideoFromFile(file) {
        if (!file || !this.video) return;
        try {
            this.clean();
            const url = URL.createObjectURL(file);
            this.video.src = url;
            this.video.load();
        } catch (err) {
            console.error("Lỗi load file:", err);
        }
    }

    loadVideoFromURL(url) {
        if (!url || !this.video) return;
        this.clean();
        this.video.src = url;
    }

    _apply_transform_() {
        if (!this.video) return;
        this.video.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
    }

    clean() {
        if (this.video.src && this.video.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.video.src);
        }
        this.video.src = "";
        this.transform = { scale: 1, x: 0, y: 0 };
        this._apply_transform_();
    }
}


const videoContainer = document.querySelector("#videoWrap");
const inputVideo = document.querySelector("#videoUpload");
const video_manager = new VideoManager(videoContainer);
inputVideo.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) video_manager.loadVideoFromFile(file);
})
