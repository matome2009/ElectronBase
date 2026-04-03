import './common/loadLocalEnv';
import * as admin from 'firebase-admin';
import * as coreExports from './modules/core';
import * as billingExports from './modules/billing';
import * as walletExports from './modules/wallet';
import * as transactionExports from './modules/transaction';
import * as contactExports from './modules/contact';
import * as labelExports from './modules/label';
import * as rpcExports from './modules/rpc';
import { OPTIONAL_API_FLAGS } from './common/features';

const databaseURL = process.env.FIREBASE_DATABASE_URL;

admin.initializeApp(
  databaseURL
    ? { databaseURL }
    : undefined,
);

const exportsObject: Record<string, unknown> = {
  ...coreExports,
};

if (OPTIONAL_API_FLAGS.billing) {
  Object.assign(exportsObject, billingExports);
}
if (OPTIONAL_API_FLAGS.wallet) {
  Object.assign(exportsObject, walletExports);
}
if (OPTIONAL_API_FLAGS.transaction) {
  Object.assign(exportsObject, transactionExports, rpcExports);
}
if (OPTIONAL_API_FLAGS.contact) {
  Object.assign(exportsObject, contactExports);
}
if (OPTIONAL_API_FLAGS.label) {
  Object.assign(exportsObject, labelExports);
}

module.exports = exportsObject;
