import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserAddress } from '../types/index.js';
import { parseCheckoutVoiceCommand } from './voiceCheckoutCommands.js';

const SAMPLE_ADDRESSES: UserAddress[] = [
  {
    id: 'addr-delhi',
    name: 'Shubham Bansal',
    phone: '+91 98765 43210',
    street: 'Plot 12, Barakhamba Road',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110001',
    isDefault: true,
  },
  {
    id: 'addr-blr',
    name: 'Shubham Office',
    phone: '+91 98765 43210',
    street: 'Level 4, Indiranagar 100 Feet Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    isDefault: false,
  },
];

test('parseCheckoutVoiceCommand confirms default address explicitly', () => {
  const result = parseCheckoutVoiceCommand('Confirm address', SAMPLE_ADDRESSES, 'upi');
  assert.equal(result.matched, true);
  assert.equal(result.intent, 'confirm_address');
  assert.equal(result.addressId, 'addr-delhi');
  assert.equal(result.confirmAddress, true);
});

test('parseCheckoutVoiceCommand selects and confirms address by city, pin code, or ordinal', () => {
  const byCity = parseCheckoutVoiceCommand('Deliver to Bengaluru', SAMPLE_ADDRESSES, 'upi');
  assert.equal(byCity.matched, true);
  assert.equal(byCity.addressId, 'addr-blr');
  assert.equal(byCity.confirmAddress, true);

  const byPin = parseCheckoutVoiceCommand('Ship to 560038', SAMPLE_ADDRESSES, 'upi');
  assert.equal(byPin.addressId, 'addr-blr');

  const byOrdinal = parseCheckoutVoiceCommand('Use second address', SAMPLE_ADDRESSES, 'upi');
  assert.equal(byOrdinal.addressId, 'addr-blr');
});

test('parseCheckoutVoiceCommand selects and confirms payment methods and apps', () => {
  const gpay = parseCheckoutVoiceCommand('Pay using Google Pay', SAMPLE_ADDRESSES, 'card');
  assert.equal(gpay.matched, true);
  assert.equal(gpay.paymentMethod, 'upi');
  assert.equal(gpay.upiApp, 'gpay');
  assert.equal(gpay.confirmPayment, true);

  const cod = parseCheckoutVoiceCommand('Switch to Cash on Delivery', SAMPLE_ADDRESSES, 'upi');
  assert.equal(cod.paymentMethod, 'cod');
  assert.equal(cod.confirmPayment, true);

  const hdfc = parseCheckoutVoiceCommand('Use HDFC net banking', SAMPLE_ADDRESSES, 'upi');
  assert.equal(hdfc.paymentMethod, 'netbanking');
  assert.equal(hdfc.netbankingBank, 'HDFC Bank');
  assert.equal(hdfc.confirmPayment, true);

  const confirmCurrent = parseCheckoutVoiceCommand('Confirm payment method', SAMPLE_ADDRESSES, 'card');
  assert.equal(confirmCurrent.intent, 'confirm_payment');
  assert.equal(confirmCurrent.confirmPayment, true);
});

test('parseCheckoutVoiceCommand handles combined confirmations and pay now submit intent', () => {
  const both = parseCheckoutVoiceCommand(
    'Confirm address and payment method',
    SAMPLE_ADDRESSES,
    'wallet'
  );
  assert.equal(both.matched, true);
  assert.equal(both.intent, 'confirm_both');
  assert.equal(both.confirmAddress, true);
  assert.equal(both.confirmPayment, true);

  const submit = parseCheckoutVoiceCommand('Place order now', SAMPLE_ADDRESSES, 'upi');
  assert.equal(submit.matched, true);
  assert.equal(submit.intent, 'submit_payment');
  assert.equal(submit.submitPayment, true);
});

test('parseCheckoutVoiceCommand safely rejects empty or unrecognized commands', () => {
  const empty = parseCheckoutVoiceCommand('   ', SAMPLE_ADDRESSES, 'upi');
  assert.equal(empty.matched, false);
  assert.equal(empty.intent, 'unknown');

  const unknown = parseCheckoutVoiceCommand('What is the weather today', SAMPLE_ADDRESSES, 'upi');
  assert.equal(unknown.matched, false);
  assert.equal(unknown.intent, 'unknown');
});
