import express from 'express';
import { registerMockTests } from './mock.suite.js';

registerMockTests(express, 'express 5');
