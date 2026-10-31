import {numberCatalog} from './illustrations.mjs';
import {createProtocolCatalog} from './protocol.mjs';
export const locations = [
 {id:'top',name:'Superficie superior',short:'Superficie',color:'#537e8a',description:'Equipo y material sobre la mesa del carro.',number:null},
 {id:'d1',name:'Medicación',short:'Cajón 1',color:'#dc624c',number:1,description:'Caja de medicación del anexo II y documentación del carro.'},
 {id:'d2',name:'Vía aérea',short:'Cajón 2',color:'#eab741',number:2,description:'Laringoscopio, cánulas, recambios y material auxiliar del protocolo.'},
 {id:'d3',name:'Vía venosa',short:'Cajón 3',color:'#42a899',number:3,description:'Material de punción, jeringas y accesorios.'},
 {id:'d4',name:'Intubación y sondas',short:'Cajón 4',color:'#387ab6',number:4,description:'Tubos y material en envases alargados.'},
 {id:'d5',name:'Ventilación y aspiración',short:'Cajón 5',color:'#237680',number:5,description:'Ambú, mascarillas y material de ventilación y aspiración.'},
 {id:'side',name:'Laterales',short:'Laterales',color:'#8a769c',number:null,description:'Compartimentos y accesorios exteriores. Consulta la ubicación en cada ficha.'},
 {id:'back',name:'Parte posterior',short:'Trasera',color:'#758c9b',number:null,description:'Vista exterior. El protocolo enumera la tabla sin fijar una posición concreta.'},
 {id:'other',name:'Otros materiales del protocolo',short:'Otros materiales',color:'#758c9b',number:null,description:'Dotación sin cajón específico asignado en el documento.'},
 {id:'fluids',name:'Fluidoterapia',short:'Fluidoterapia',color:'#537e8a',number:null,description:'Soluciones del anexo II. Referencia lateral ilustrada en el anexo IV.'}
];
const source=(video,time)=>({video:`WhatsApp Video 2026-09-26 at 17.05.${video}.mp4`,time});
// "visible" means supported by the sampled footage, not clinically validated.
// No quantities, medication contents, doses or patient information are stored.
const observations = [
 {id:'defib',name:'Monitor / desfibrilador',location:'top',sprite:1,aliases:['monitor','desfibrilador','desfibri'],evidence:'visible',practice:true,note:'Equipo visible sobre el soporte superior. Ilustración genérica, sin reproducir controles operativos.',sources:[source('52','00:04')]},
 {id:'ambu',name:'Balón resucitador (Ambú)',location:'top',sprite:0,aliases:['ambu','ambú','balón','resucitador','ventilación manual'],evidence:'visible',practice:true,note:'Observado sobre el paño verde. También aparece mencionado en la etiqueta del cajón 5; confirma la ubicación habitual con el servicio.',sources:[source('41','00:04')]},
 {id:'sharps',name:'Contenedor de punzantes',location:'top',sprite:null,aliases:['contenedor','punzantes','residuos','amarillo'],evidence:'visible',practice:true,note:'Contenedor amarillo visible junto al equipo de la superficie.',sources:[source('52','00:04')]},
 {id:'medcase',name:'Maletín organizador de medicación',location:'d1',sprite:3,aliases:['maletín','medicación','organizador','caja medicamentos'],evidence:'visible',practice:true,note:'Maletín cerrado con compartimentos tapados. No se representa ni se presupone su contenido.',sources:[source('41','00:18')]},
 {id:'atropine-label',name:'Recipiente rotulado «Atropina»',location:'d1',sprite:null,aliases:['atropina','vaso','ampollas'],evidence:'label',practice:false,note:'Se lee el rótulo del recipiente. La identidad del contenido no se ha comprobado; no forma parte de la práctica.',sources:[source('41','00:18')]},
 {id:'laryngo-case',name:'Estuche «Laringo y palas»',location:'d2',sprite:4,aliases:['laringo','laringoscopio','palas','estuche'],evidence:'visible',practice:true,note:'Estuche negro cerrado con rótulo legible. Su contenido interior no se ha comprobado.',sources:[source('41','00:28')]},
 {id:'airway',name:'Cánulas orofaríngeas',location:'d2',sprite:5,aliases:['guedel','cánula','canula','vía aérea'],evidence:'visible',practice:true,note:'Envases de cánulas visibles delante del estuche. No se atribuyen tallas ni calibres.',sources:[source('41','00:28')]},
 {id:'forceps',name:'Pinza metálica',location:'d2',sprite:6,aliases:['pinza','magill'],evidence:'uncertain',practice:false,note:'Instrumento metálico con anillas visible en un lateral. La identificación como pinza de Magill está pendiente.',sources:[source('41','00:28')]},
 {id:'gel',name:'Frasco de gel',location:'d2',sprite:7,aliases:['gel','lubricante','conductor'],evidence:'visible',practice:true,note:'Frasco con texto GEL visible junto al estuche. Tipo de gel sin confirmar.',sources:[source('41','00:28')]},
 {id:'tape-air',name:'Esparadrapo',location:'d2',sprite:null,aliases:['esparadrapo','cinta','rollo'],evidence:'visible',practice:true,note:'Rollo de cinta visible en el lateral del cajón.',sources:[source('41','00:28')]},
 {id:'torch',name:'Linterna',location:'d2',sprite:null,aliases:['linterna','luz'],evidence:'label',practice:false,note:'Mencionada en el rótulo frontal. No se ha localizado el objeto en las imágenes revisadas.',sources:[source('52','00:18')]},
 {id:'syringes',name:'Jeringas en envase',location:'d3',sprite:2,aliases:['jeringa','jeringas','inyección'],evidence:'visible',practice:true,note:'Jeringas empaquetadas visibles. No se especifican capacidades.',sources:[source('41','00:35')]},
 {id:'needles',name:'Material de punción en envase',location:'d3',sprite:null,aliases:['aguja','agujas','punción','catéter','abbocath'],evidence:'uncertain',practice:false,note:'Se observan envases de material de punción. El tipo y los calibres de cada referencia requieren confirmación.',sources:[source('41','00:35')]},
 {id:'electrodes',name:'Electrodos',location:'d3',sprite:8,aliases:['electrodos','ecg','monitorización'],evidence:'label',practice:false,note:'Figuran en el rótulo del cajón. No se consideran identificados individualmente entre los envases superpuestos.',sources:[source('41','00:42')]},
 {id:'tourniquet',name:'Banda azul enrollada',location:'d3',sprite:9,aliases:['compresor','torniquete','banda'],evidence:'uncertain',practice:false,note:'Objeto azul enrollado entre los envases. Identificación como compresor venoso pendiente.',sources:[source('41','00:35')]},
 {id:'ett',name:'Tubos endotraqueales',location:'d4',sprite:10,aliases:['tubo','endotraqueal','intubación','tubos'],evidence:'visible',practice:true,note:'Envases rotulados de tubos endotraqueales. Los calibres no se han verificado.',sources:[source('41','00:42')]},
 {id:'ng',name:'Sondas nasogástricas',location:'d4',sprite:11,aliases:['sonda','nasogástrica','sng'],evidence:'label',practice:false,note:'Mencionadas en el rótulo frontal. Identificación individual de los envases pendiente.',sources:[source('41','00:48')]},
 {id:'drip',name:'Sistemas de goteo',location:'d4',sprite:11,aliases:['sistema','goteo','perfusión','infusión'],evidence:'label',practice:false,note:'Mencionados en el rótulo frontal. Tipo de sistema sin confirmar.',sources:[source('41','00:48')]},
 {id:'mask-blue',name:'Mascarilla con reborde azul',location:'d5',sprite:null,aliases:['mascarilla','azul','resucitación'],evidence:'visible',practice:true,note:'Mascarilla transparente con reborde azul visible en el cajón inferior.',sources:[source('41','00:48')]},
 {id:'mask-green',name:'Mascarilla de oxígeno',location:'d5',sprite:13,aliases:['mascarilla','oxígeno','verde','venturi'],evidence:'visible',practice:true,note:'Mascarilla verde con tubuladura visible. No se atribuyen concentraciones ni características no verificadas.',sources:[source('41','00:48')]},
 {id:'stethoscope',name:'Fonendoscopio',location:'d5',sprite:12,aliases:['fonendo','estetoscopio','fonendoscopio'],evidence:'uncertain',practice:false,note:'El informe de referencia lo identifica entre el material; la forma completa no es inequívoca en el fotograma comprobado. Pendiente de confirmar.',sources:[source('41','00:48')]},
 {id:'yankauer',name:'Cánulas tipo Yankauer',location:'d5',sprite:14,aliases:['yankauer','aspiración','cánula rígida'],evidence:'uncertain',practice:false,note:'Identificación propuesta por el informe de referencia. Los envases del fotograma comprobado no permiten confirmarla.',sources:[source('41','00:48')]},
 {id:'fluids',name:'Botellas de infusión',location:'side',sprite:null,aliases:['suero','sueros','botella','infusión'],evidence:'visible',practice:true,note:'Visibles en el compartimento lateral basculante. No se atribuyen volumen ni composición.',sources:[source('52','01:08')]},
 {id:'bag',name:'Mochila de emergencias',location:'side',sprite:null,aliases:['mochila','botiquín','bolsa roja'],evidence:'visible',practice:true,note:'Mochila roja con bandas reflectantes. Permanece cerrada; contenido no comprobado.',sources:[source('52','01:15')]},
 {id:'board',name:'Tabla rígida de reanimación',location:'back',sprite:15,aliases:['tabla','rcp','cpr','masaje cardíaco'],evidence:'visible',practice:true,note:'Tabla blanca situada en los soportes posteriores del carro.',sources:[source('52','01:15')]}
];
export const items=numberCatalog(createProtocolCatalog(observations));
export const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function searchItems(query='',location='all') {
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return items.filter(item=>(location==='all'||item.location===location)&&terms.every(term=>normalize([item.name,...item.aliases,locations.find(l=>l.id===item.location).name].join(' ')).includes(term)));
}
export const practiceItems=items.filter(item=>item.practice&&item.evidence==='protocol');

