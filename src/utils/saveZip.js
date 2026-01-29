import { saveAs } from 'file-saver';

export const saveZip = zipFile => {
  saveAs(zipFile, 'images.zip');
};
