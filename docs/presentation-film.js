/* Local video alternative. No network services, storage, or personal data. */
(() => {
  'use strict';
  class PortfolioFilm {
    constructor({video, poster, wrapper, scene, onFailure, onEnd}) {
      Object.assign(this, {video, poster, wrapper, scene, onFailure, onEnd});
      this.active=false; this.failed=false; this.reduced=false;
      this.token=0; this.wantPlaying=false; this.pendingTime=0; this.selected=null;
      video.addEventListener('loadedmetadata', () => {
        if (!this.active) return;
        if (!Number.isFinite(video.duration) || Math.abs(video.duration-9)>0.1) {
          this.fail(); return;
        }
        this.seek(this.pendingTime);
      });
      video.addEventListener('error', () => { if (this.active) this.fail(); });
      video.addEventListener('ended', () => {
        if (this.active && !this.reduced && this.wantPlaying) this.onEnd();
      });
    }
    configure(narrow) {
      this.pause();
      if (this.failed || typeof this.video.play!=='function') {
        this.active=false; this.display(); return false;
      }
      const mode=narrow?'movil':'escritorio';
      const poster=`media/poster-${mode}-r185-r5.png`;
      this.active=true;
      if (this.selected!==mode) {
        this.selected=mode; this.pendingTime=0;
        this.poster.src=poster; this.video.poster=poster;
        this.video.preload='metadata';
        this.video.src=`media/presentacion-${mode}-r185-r5.mp4`;
        this.video.load();
      }
      this.display(); return true;
    }
    display() {
      this.wrapper.hidden=!this.active; this.scene.hidden=this.active;
      this.video.hidden=this.reduced; this.poster.hidden=!this.reduced;
    }
    setReduced(value) {
      this.reduced=Boolean(value);
      if (this.reduced) this.pause();
      this.display();
    }
    time() {
      const value=this.video.currentTime;
      return Number.isFinite(value)?Math.max(0,Math.min(9,value)):this.pendingTime;
    }
    seek(value) {
      this.pendingTime=Math.max(0,Math.min(9,Number(value)||0));
      if (this.active && this.video.readyState>=1) this.video.currentTime=this.pendingTime;
    }
    async play() {
      if (!this.active || this.reduced) return {ok:false,cancelled:true};
      const token=++this.token; this.wantPlaying=true;
      try {
        await this.video.play();
        if (token!==this.token) {
          if (!this.wantPlaying) this.video.pause();
          return {ok:false,cancelled:true};
        }
        return {ok:true,cancelled:false};
      } catch {
        if (token!==this.token) return {ok:false,cancelled:true};
        this.wantPlaying=false;
        return {ok:false,cancelled:false};
      }
    }
    pause() {
      ++this.token; this.wantPlaying=false; this.video.pause();
    }
    fail() {
      this.pause(); this.active=false; this.failed=true; this.display();
      this.onFailure();
    }
  }
  globalThis.PortfolioFilm=PortfolioFilm;
})();
