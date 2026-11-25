import express from 'express4';
import { registerMockTests } from './mock.suite.js';

registerMockTests(express, 'express 4');
