import { hello } from './example-module';

console.log(hello());

/* eslint-disable @typescript-eslint/no-unused-vars */
function doGet() {
  return HtmlService.createTemplateFromFile('ui').evaluate().setTitle('');
}
/* eslint-disable @typescript-eslint/no-unused-vars */
function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
