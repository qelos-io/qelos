import express from 'express';
import { registerMiddlewareTests } from './middleware.suite.js';

registerMiddlewareTests(express, 'express 5');
