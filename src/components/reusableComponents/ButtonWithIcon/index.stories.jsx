import { ButtonWithIcon } from './index';

export default {
  title: 'ButtonWithIcon',
  component: ButtonWithIcon,
  tags: ['autodocs'],
};

export const WithText = {
  args: {
    buttons: [
      { icon: 'EditIcon', text: 'Edit' },
      { icon: 'DeleteIcon', text: 'Delete' },
    ],
    classNameBox: 'button-container',
    classNameButton: 'button-primary',
    classNameIcon: 'icon-primary',
    color: '#000000',
    accentColor: '#ff5733',
  },
};
export const WithoutText = {
  args: {
    buttons: [
      { icon: 'EditIcon' },
      { icon: 'DeleteIcon'},
    ],
    classNameBox: 'button-container',
    classNameButton: 'button-primary',
    classNameIcon: 'icon-primary',
    color: '#000000',
    accentColor: '#ff5733',
  },
};


