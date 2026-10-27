'use strict';
const states=['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
const guidance={
'Telangana':{text:'Section 8 of the Telangana Buildings (Lease, Rent and Eviction) Control Act provides a right to a signed receipt for rent or an advance, where the Act applies. Confirm scope, exclusions and any prescribed form for your premises.',url:'https://www.indiacode.nic.in/bitstream/123456789/8607/1/act_15_of_1960.pdf',label:'Telangana rent control Act · Section 8'},
'Maharashtra':{text:'Section 31 of the Maharashtra Rent Control Act requires a written receipt for amounts received where the Act applies. Prescribed form and manner must also be checked. This general template is not certified as Maharashtra Form I.',url:'https://www.indiacode.nic.in/bitstream/123456789/15817/1/the_maharashtra_rent_control_act_1999.pdf',label:'Maharashtra Rent Control Act · Section 31'},
'Karnataka':{text:'Section 16(2) of the Karnataka Rent Act entitles a tenant to a written receipt signed by the landlord or authorised agent for rent, charges or advances where the Act applies. Check the Act’s scope and exclusions for your premises.',url:'https://www.indiacode.nic.in/bitstream/123456789/7810/1/34_of_2001_e.pdf',label:'Karnataka Rent Act · Section 16'},
'Tamil Nadu':{text:'Section 13(2) of the 2017 tenancy Act provides for a signed written receipt from the landlord or property manager. Review amendments and applicability on the official tenancy portal, including provisions relating to electronic payments.',url:'https://www.tenancy.tn.gov.in/Content/Documents/TNRRRLTact2017.pdf',label:'Tamil Nadu tenancy Act · Section 13'},
'Delhi':{text:'Section 26 of the Delhi Rent Control Act provides for a receipt signed by the landlord or authorised agent for rent paid, where that Act applies. Check coverage, exclusions and the prescribed form before relying on this general receipt.',url:'https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_5_00115_195859_1666697046553&orderno=34&sectionId=70401&sectionno=26',label:'Delhi Rent Control Act · Section 26'}
};
const $=id=>document.getElementById(id);const fields=['state','tenant','landlord','address','pan','number','paid','from','to','amount','method','reference','annual','notes','stamp','includePan'];
let validationAttempted=false;
let panPreference="auto";
for(const group of ['States','Union territories']){const optgroup=document.createElement('optgroup');optgroup.label=group;states.slice(group==='States'?0:28,group==='States'?28:36).sort().forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;optgroup.append(o)});$('state').append(optgroup)}
$('state').value='';
function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const today=new Date();$('paid').value=iso(today);$('from').value=iso(new Date(today.getFullYear(),today.getMonth(),1));$('to').value=iso(new Date(today.getFullYear(),today.getMonth()+1,0));$('number').value=`RN-${today.getFullYear()}-001`;
function date(s){if(!s)return 'Payment date pending';const d=new Date(s+'T12:00:00');return isNaN(d)?'Date pending':d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function chunk(n){const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];let r='';if(n>=100){r=a[Math.floor(n/100)]+' Hundred ';n%=100}return (r+(n<20?a[n]:t[Math.floor(n/10)]+' '+a[n%10])).trim()}
function words(value){const total=Math.round(Number(value||0)*100);if(!Number.isFinite(total)||total<0||total>99999999999)return 'Amount outside supported range';let n=Math.floor(total/100);const p=total%100;let parts=[];for(const [div,label] of [[10000000,'Crore'],[100000,'Lakh'],[1000,'Thousand']]){if(n>=div){parts.push(chunk(Math.floor(n/div))+' '+label);n%=div}}if(n)parts.push(chunk(n));return (parts.join(' ')||'Zero')+' Rupees'+(p?' and '+chunk(p)+' Paise':'')+' Only'}
function set(id,v){$(id).textContent=v}
function panFormatError(value){
  if(!value)return '';
  if(!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value))return 'Enter 5 letters, 4 digits and 1 final letter, e.g. ABCPS1234F (illustrative only).';
  if(!'ABCFGHJLPT'.includes(value[3]))return 'Check the fourth PAN character: use P for an individual, or A, B, C, F, G, H, J, L or T for another holder type.';
  if(value.slice(5,9)==='0000')return 'The four PAN digits must be from 0001 to 9999; 0000 is not valid.';
  return '';
}
function render(){
  set('pnumber',$('number').value||'Receipt number');
  set('ppaid',date($('paid').value));
  set('ptenant',$('tenant').value||'Tenant name');
  set('plandlord',$('landlord').value||'Landlord name');
  set('paddress',$('address').value||'Your rental property address');
  set('pstate',$('state').value);
  set('pperiod',date($('from').value)+' — '+date($('to').value));
  set('pamount',new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number($('amount').value||0)));
  set('pwords',words($('amount').value));
  set('pmethod',$('method').value);

  const cash=$('method').value==='Cash';
  set('preference',!cash&&$('reference').value?'Payment reference: '+$('reference').value:'');
  set('pnotes',$('notes').value);
  $('stampbox').hidden=!$('stamp').checked;
  $('stampReminder').hidden=!$('stamp').checked;
  $('referenceField').hidden=cash;
  const cheque=$('method').value==='Cheque';
  document.querySelector('label[for="reference"]').firstChild.textContent=cheque?'Cheque reference ':'Transaction reference ';
  $('reference').placeholder=cheque?'Cheque number':'UTR or payment reference';
  const state=$('state').value,g=guidance[state];
  set('stateNote',state?(g?'Legal reference available under “Before you print”.':'General receipt available. Local legal requirements still need review.'):'Adds the state to your receipt and shows available guidance.');
  set('guideText',g?g.text:state?'Legal review is pending for '+state+'. Check applicable local tenancy, receipt-form and stamp requirements before using this general receipt for a statutory purpose.':'This tool creates a general acknowledgement of rent paid. State selection is optional. Add your state beside the property address to see available guidance. Check applicable local requirements if you need a statutory receipt.');
  $('guideLink').hidden=!g;
  if(g){$('guideLink').href=g.url;set('guideLink','Read '+g.label+' ↗');}else{$('guideLink').removeAttribute('href');}
  set('guideFooter',g?'Reference reviewed 27 Oct 2026. Applicability and amendments need checking for your premises. This template is not a certified prescribed form.':'This template does not certify compliance with state-specific requirements.');
  const assessment=panAssessment();
  const included=panPreference==='auto'?assessment.suggest:panPreference==='include';
  $('includePan').checked=included;
  $('panField').hidden=!included;
  $('pan').disabled=!included;
  $('pan').required=included;
  $('pan').value=$('pan').value.trim().toUpperCase();
  const panError=included?panFormatError($('pan').value):'';
  $('pan').setCustomValidity(panError);
  $('panFormatStatus').hidden=!included||!$('pan').value||!!panError;
  set('ppan',included&&$('pan').value?'PAN: '+$('pan').value.toUpperCase():'');
  const annualText=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(assessment.annual);
  set('panAssessment',(assessment.actual?'Annual rent entered: ':'Estimated annual rent (rent × 12): ')+annualText+'. '+(assessment.suggest?'Above ₹1 lakh: PAN is switched on by default for HRA documentation.':'Include PAN if needed for your submission.')+(assessment.actual?'':' Assumes monthly rent for all 12 months.'));
  $('panOptOutNote').hidden=!(assessment.suggest&&!included);
  $('resetPan').hidden=panPreference==='auto';
  $('panCheck').hidden=!assessment.suggest;
  set('panCheck',assessment.suggest?(included?($('pan').value?(panError?'Landlord PAN needs a format correction.':'Landlord PAN included; format checked only.'):'Enter landlord PAN to print, or uncheck “Include landlord PAN” if it does not apply to this receipt.'):'PAN excluded by your choice. Check your employer’s HRA documentation requirements.'):'');
  $('to').setCustomValidity($('from').value&&$('to').value&&$('to').value<$('from').value?'The rent end date must be on or after the start date.':'');
  for(const id of ['tenant','landlord','address','number']){
    $(id).setCustomValidity($(id).value&&!$(id).value.trim()?'Enter '+({tenant:'the tenant name',landlord:'the landlord name',address:'the rental property address',number:'a receipt number'}[id])+', not only spaces.':'');
  }
  updateReadiness();
}
function panAssessment(){
  const actual=$('annual').value!==''&&$('annual').validity.valid;
  const amount=Number($('amount').value||0);
  const annual=actual?Number($('annual').value):Math.max(0,Number.isFinite(amount)?amount:0)*12;
  return {actual,annual,suggest:annual>100000};
}
fields.forEach(id=>$(id).addEventListener('input',()=>{
  if(id==='pan')$('pan').value=$('pan').value.toUpperCase();
  if(id==='includePan')panPreference=$('includePan').checked?'include':'exclude';
  set('status','');render();
}));
$('resetPan').addEventListener('click',()=>{panPreference='auto';render()});
const fieldNames={tenant:'Tenant name',landlord:'Landlord / recipient name',address:'Rental property address',amount:'Rent received',from:'Rent period start',to:'Rent period end',paid:'Payment date',number:'Receipt number',pan:'Landlord PAN',annual:'Annual rent'};
function invalidFields(){return Array.from($('form').elements).filter(field=>field.willValidate&&!field.validity.valid)}
function issue(field){
  const name=fieldNames[field.id]||field.id;
  if(field.id==='pan'&&field.validity.valueMissing)return 'Enter landlord PAN, or uncheck “Include landlord PAN” to omit it from this receipt.';
  if(field.validity.valueMissing)return 'Enter '+name.toLowerCase()+'.';
  if(field.id==='pan')return panFormatError(field.value)||'Check the landlord PAN character pattern.';
  if(field.validity.rangeUnderflow&&field.id==='amount')return 'Enter rent received greater than ₹0.';
  if(field.validity.rangeOverflow&&field.id==='amount')return 'Rent received must be ₹99,99,99,999.99 or less.';
  if(field.validity.stepMismatch)return name+' can have no more than two decimal places.';
  if(field.validity.badInput)return 'Enter a valid '+name.toLowerCase()+'.';
  return field.validationMessage||'Check '+name.toLowerCase()+'.';
}
function focusField(field){const details=field.closest('details');if(details)details.open=true;field.focus();field.scrollIntoView({behavior:'smooth',block:'center'})}
function updateReadiness(){
  const invalid=invalidFields(),ready=invalid.length===0;
  document.body.classList.toggle('receipt-incomplete',!ready);
  $('draftBadge').hidden=ready;
  set('receiptState',ready?'A4 · READY TO PRINT':'DRAFT · DETAILS NEEDED');
  set('completionStatus',ready?('Ready to print. '+(panAssessment().suggest&&!$('includePan').checked?'PAN excluded by your choice. ':'')+'Check the details, then have the recipient sign.'):invalid.length+' field'+(invalid.length===1?' needs':'s need')+' attention before printing or saving a PDF.');
  $('completionStatus').classList.toggle('is-ready',ready);
  $('validationSummary').hidden=!validationAttempted||ready;
  $('validationList').replaceChildren();
  for(const field of Array.from($('form').elements))if(field.id)field.removeAttribute('aria-invalid');
  if(validationAttempted)for(const field of invalid){
    field.setAttribute('aria-invalid','true');
    const li=document.createElement('li'),link=document.createElement('a');
    link.href='#'+field.id;link.textContent=issue(field);link.addEventListener('click',e=>{e.preventDefault();focusField(field)});li.append(link);$('validationList').append(li);
  }
  return ready;
}
$('form').addEventListener('submit',e=>{
  e.preventDefault();validationAttempted=true;render();
  if(!updateReadiness()){set('status','Printing is blocked until the highlighted details are complete.');focusField(invalidFields()[0]);return}
  set('status','');window.print();
});
window.addEventListener('beforeprint',()=>{render();updateReadiness()});
$('previewButton').addEventListener('click',e=>{e.preventDefault();$('receipt').scrollIntoView({behavior:'smooth',block:'start'});$('receipt').focus({preventScroll:true});});
function moveMonth(s){const d=new Date(s+'T12:00:00');const end=d.getDate()===new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const day=d.getDate();return iso(new Date(d.getFullYear(),d.getMonth()+1,end?new Date(d.getFullYear(),d.getMonth()+2,0).getDate():Math.min(day,new Date(d.getFullYear(),d.getMonth()+2,0).getDate())))}
$('next').addEventListener('click',()=>{if(!$('from').value||!$('to').value){set('status','Enter the current rent period first.');return}$('from').value=moveMonth($('from').value);$('to').value=moveMonth($('to').value);$('paid').value='';$('reference').value='';$('number').value=$('number').value.replace(/(\d+)$/,n=>String(Number(n)+1).padStart(n.length,'0'));set('status','Period advanced. Add the actual payment date and reference after receiving the rent.');render()});
$('sample').addEventListener('click',()=>{Object.entries({state:'Karnataka',tenant:'Aarav Sharma',landlord:'Meera Rao',address:'Flat 204, Greenview Apartments\nIndiranagar, Bengaluru — 560038',amount:'18000',method:'UPI',reference:'EXAMPLE-TRANSACTION',notes:'Illustrative example — replace with actual payment details.'}).forEach(([k,v])=>$(k).value=v);$('pan').value='';$('annual').value='';panPreference='auto';render();set('status','Example details loaded. Replace them with your actual payment details before printing.')});render();
