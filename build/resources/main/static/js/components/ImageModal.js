class ImageModal {
    constructor() {
        this.imageModal = document.getElementById('image-modal');
        this.modalImage = document.getElementById('modal-image');
        this.modalPrev = document.getElementById('modal-prev');
        this.modalNext = document.getElementById('modal-next');
        this.modalClose = document.getElementById('modal-close');
        this.modalCounter = document.getElementById('modal-counter');
        
        this.currentImages = [];
        this.currentIndex = 0;
        
        this.init();
    }

    init() {
        if (!this.imageModal) return;

        this.modalPrev.addEventListener('click', () => this.showPrevious());
        this.modalNext.addEventListener('click', () => this.showNext());
        this.modalClose.addEventListener('click', () => this.close());

        this.imageModal.addEventListener('click', (e) => {
            if (e.target === this.imageModal) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!this.imageModal.classList.contains('active')) return;
            
            switch(e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowLeft':
                    if (this.currentImages.length > 1) {
                        this.showPrevious();
                    }
                    break;
                case 'ArrowRight':
                    if (this.currentImages.length > 1) {
                        this.showNext();
                    }
                    break;
            }
        });

        window.showImageModal = (images, index) => this.show(images, index);
    }

    show(images, index = 0) {
        this.currentImages = images;
        this.currentIndex = index;
        this.updateImage();
        this.imageModal.classList.add('active');
        
        const showNavigation = images.length > 1;
        this.modalPrev.classList.toggle('hidden', !showNavigation);
        this.modalNext.classList.toggle('hidden', !showNavigation);
    }

    close() {
        this.imageModal.classList.remove('active');
    }

    showPrevious() {
        this.currentIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
        this.updateImage();
    }

    showNext() {
        this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
        this.updateImage();
    }

    updateImage() {
        if (this.currentImages.length === 0) return;
        
        this.modalImage.src = this.currentImages[this.currentIndex];
        this.modalCounter.textContent = `${this.currentIndex + 1} / ${this.currentImages.length}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    new ImageModal();
});