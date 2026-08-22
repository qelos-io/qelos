import express4 from 'express4';
import { registerMiddlewareTests } from './middleware.suite.js';

registerMiddlewareTests(express4, 'express 4');
