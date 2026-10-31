export const APPS={
 evwrite:{name:'EVWrite',desc:'Create beautiful documents.',color:'var(--write)',kind:'document'},
 evcell:{name:'EVCell',desc:'Organize data and calculate with spreadsheets.',color:'var(--cell)',kind:'spreadsheet'},
 evpresent:{name:'EVPresent',desc:'Turn ideas into beautiful presentations.',color:'var(--present)',kind:'presentation'}};
// Starter set. Content is editable sample data; full template libraries arrive with each app milestone.
import {DOC_TEMPLATES} from '../templates/documents.js';
import {SHEET_TEMPLATES} from '../templates/spreadsheets.js';
const BASE=[
 {id:'w-blank',app:'evwrite',cat:'Basic',title:'Blank document',desc:'Empty A4 page.',format:'A4',data:{html:'<p></p>',paper:'A4'}},
 {id:'w-resume',app:'evwrite',cat:'Career',title:'Professional resume / CV',desc:'Clean one-page CV (sample text).',format:'A4',data:{html:'<h1>Your Name</h1><p>Sample: email, phone</p><h2>Experience</h2><p>Sample entry</p>',paper:'A4'}},
 {id:'w-minutes',app:'evwrite',cat:'Business',title:'Meeting minutes',desc:'Agenda, attendees, decisions.',format:'A4',data:{html:'<h1>Meeting Minutes</h1><h2>Attendees</h2><h2>Decisions</h2>',paper:'A4'}},
 {id:'w-waterreport',app:'evwrite',cat:'Engineering',title:'Water-supply project report',desc:'Scope, progress, issues.',format:'A4',data:{html:'<h1>Water-Supply Project Report</h1><h2>Scope</h2><h2>Progress</h2>',paper:'A4'}},
 {id:'c-blank',app:'evcell',cat:'Basic',title:'Blank spreadsheet',desc:'One empty sheet.',format:'Grid',data:{sheets:[{name:'Sheet1',cells:{}}]}},
 {id:'c-budget',app:'evcell',cat:'Finance',title:'Monthly budget',desc:'Income vs expense with totals (sample data).',format:'Grid',data:{sheets:[{name:'Budget',cells:{A1:'Item',B1:'Amount',A2:'Salary (sample)',B2:50000,A3:'Rent (sample)',B3:-15000,A4:'Total',B4:'=SUM(B2:B3)'}}]}},
 {id:'c-boq',app:'evcell',cat:'Engineering',title:'BOQ',desc:'Quantity x rate = amount.',format:'Grid',data:{sheets:[{name:'BOQ',cells:{A1:'Item',B1:'Qty',C1:'Rate',D1:'Amount',A2:'Pipe (sample)',B2:100,C2:450,D2:'=B2*C2'}}]}},
 {id:'c-marks',app:'evcell',cat:'Education',title:'Student marksheet',desc:'Marks with average.',format:'Grid',data:{sheets:[{name:'Marks',cells:{A1:'Student',B1:'Marks',A2:'Sample',B2:80,A3:'Average',B3:'=AVERAGE(B2:B2)'}}]}},
 {id:'p-blank',app:'evpresent',cat:'Basic',title:'Blank presentation',desc:'One empty 16:9 slide.',format:'16:9',data:{ratio:'16:9',slides:[{layout:'blank',objects:[]}]}},
 {id:'p-pitch',app:'evpresent',cat:'Business',title:'Business pitch deck',desc:'Title, problem, solution.',format:'16:9',data:{ratio:'16:9',slides:[{layout:'cover',title:'Your Pitch'},{layout:'text',title:'Problem'},{layout:'text',title:'Solution'}]}},
 {id:'p-progress',app:'evpresent',cat:'Engineering',title:'Construction progress presentation',desc:'Status, photos, schedule.',format:'16:9',data:{ratio:'16:9',slides:[{layout:'cover',title:'Progress Report'},{layout:'text',title:'Status'}]}}];
export const TEMPLATES=[...BASE.filter(t=>!['w-resume','w-minutes','w-waterreport','c-budget','c-boq','c-marks'].includes(t.id)),...DOC_TEMPLATES,...SHEET_TEMPLATES];
