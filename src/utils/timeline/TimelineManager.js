/**
 * TimelineManager - Lightweight timeline zoom management
 * Singleton class for centralized zoom control
 */
class TimelineManager {
  static instance = null;

  static DEFAULT_VALUES = {
    zoomMax: 30,
    zoomMin: 1,
    zoomVal: 2,
    timelineZoom: 1,
  };

  constructor() {
    if (TimelineManager.instance) {
      return TimelineManager.instance;
    }

    this.viewData = {
      zoomMax: TimelineManager.DEFAULT_VALUES.zoomMax,
      zoomMin: TimelineManager.DEFAULT_VALUES.zoomMin,
      zoomVal: TimelineManager.DEFAULT_VALUES.zoomVal,
      timelineZoom: TimelineManager.DEFAULT_VALUES.timelineZoom,
    };

    this.eventListeners = {
      ZoomChangeStart: [],
      ZoomChangeUpdate: [],
      ZoomChangeEnd: [],
    };

    TimelineManager.instance = this;
  }

  static getInstance() {
    if (!TimelineManager.instance) {
      TimelineManager.instance = new TimelineManager();
    }
    return TimelineManager.instance;
  }

  convertTimeToPixel(time, zoom = NaN) {
    const currentZoom = isNaN(zoom) ? this.viewData.timelineZoom : zoom;
    return time * currentZoom;
  }

  convertPixelToTime(pixels, zoom = NaN) {
    const currentZoom = isNaN(zoom) ? this.viewData.timelineZoom : zoom;
    return pixels / currentZoom;
  }

  setZoomValue(newZoomVal, triggerEvents = true) {
    const clampedZoom = Math.min(
      Math.max(newZoomVal, this.viewData.zoomMin),
      this.viewData.zoomMax
    );

    if (clampedZoom === this.viewData.zoomVal) {
      return;
    }

    const oldValue = this.viewData.zoomVal;
    this.viewData.zoomVal = clampedZoom;
    this.viewData.timelineZoom =
      clampedZoom / TimelineManager.DEFAULT_VALUES.zoomVal;

    if (triggerEvents) {
      this.triggerEvent('ZoomChangeUpdate', {
        oldValue,
        newValue: clampedZoom,
        timelineZoom: this.viewData.timelineZoom,
      });
    }
  }

  zoomIn(step = 1) {
    this.setZoomValue(this.viewData.zoomVal + step);
  }

  zoomOut(step = 1) {
    this.setZoomValue(this.viewData.zoomVal - step);
  }

  resetZoom() {
    this.setZoomValue(TimelineManager.DEFAULT_VALUES.zoomVal);
  }

  getZoomPercentage() {
    const range = this.viewData.zoomMax - this.viewData.zoomMin;
    const current = this.viewData.zoomVal - this.viewData.zoomMin;
    return Math.round((current / range) * 100);
  }

  setZoomFromPercentage(percentage) {
    const range = this.viewData.zoomMax - this.viewData.zoomMin;
    const zoomValue = this.viewData.zoomMin + (percentage / 100) * range;
    this.setZoomValue(Math.round(zoomValue));
  }

  addEventListener(type, callback) {
    if (this.eventListeners[type]) {
      this.eventListeners[type].push(callback);
    }
  }

  removeEventListener(type, callback) {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        cb => cb !== callback
      );
    }
  }

  triggerEvent(eventType, data = {}) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventType} listener:`, error);
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(eventType, {
          detail: data,
        })
      );
    }
  }

  startZoomChange() {
    this.triggerEvent('ZoomChangeStart', {
      currentZoom: this.viewData.zoomVal,
    });
  }

  endZoomChange() {
    this.triggerEvent('ZoomChangeEnd', {
      currentZoom: this.viewData.zoomVal,
    });
  }

  getState() {
    return { ...this.viewData };
  }

  reset() {
    Object.assign(this.viewData, TimelineManager.DEFAULT_VALUES);
    this.viewData.timelineZoom = TimelineManager.DEFAULT_VALUES.zoomVal / 2;
  }
}

export default TimelineManager;
