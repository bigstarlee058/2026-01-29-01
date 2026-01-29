import { Suspense, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ErrorProvider } from 'contexts/ErrorContext';
import { AvatarProvider } from 'contexts/AvatarContext';
import { StoreProvider } from 'mobx/index';
import { VideoCreationPage } from 'pages/VideoCreationPage/VideoCreationPage';
import Layout from 'components/Layout/Layout';
import { ThemeProvider } from 'components/ThemeProvider/ThemeProvider';
import { PageProvider } from 'hooks/PageContext';
import './theme.scss';


export const App = () => {


  return (
    <StoreProvider>
        <ThemeProvider>
          <ErrorProvider>
            <AvatarProvider>
              <DndProvider backend={HTML5Backend}>
                <PageProvider>
                  <Suspense fallback={null}>
                    <>
                      <Routes>
                        <Route
                          path="*"
                          element={
                            <Navigate
                              to="/createVideo/68cc5221256a17b46c56d56c"
                              replace
                            />
                          }
                        />
                        <Route element={<Layout />}>
                          <Route
                            path="createVideo/68cc5221256a17b46c56d56c"
                            element={<VideoCreationPage />}
                          />
                        </Route>
                      </Routes>
                    </>
                  </Suspense>
                  {/* <SocketStatus showDetails={true} /> */}
                </PageProvider>
              </DndProvider>
            </AvatarProvider>
          </ErrorProvider>
        </ThemeProvider>
    </StoreProvider>
  );
};
