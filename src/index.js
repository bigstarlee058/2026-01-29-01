// Patch for Canvas textBaseline 'alphabetical' error
if (typeof CanvasRenderingContext2D !== 'undefined') {
  const originalSetTextBaseline = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'textBaseline').set;
  Object.defineProperty(CanvasRenderingContext2D.prototype, 'textBaseline', {
    set(value) {
      if (value === 'alphabetical') {
        originalSetTextBaseline.call(this, 'alphabetic');
      } else {
        originalSetTextBaseline.call(this, value);
      }
    },
    get() {
      return originalSetTextBaseline.call(this);
    }
  });
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { store, persistor } from './redux/store';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import { SidebarProvider } from 'hooks/useSidebar';
import './index.scss';


ReactDOM.createRoot(document.getElementById('root')).render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <SidebarProvider>
            <App />
          </SidebarProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
);

