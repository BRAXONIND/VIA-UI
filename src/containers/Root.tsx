import {Provider} from 'react-redux';
import {Router} from 'wouter';

import {store} from '../store';
import Routes from '../Routes';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export default () => (
  <Provider store={store}>
    <Router base={basePath}>
      <Routes />
    </Router>
  </Provider>
);
