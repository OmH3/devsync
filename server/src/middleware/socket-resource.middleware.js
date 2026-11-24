import Doc from '../models/Docs.model.js';
import Code from '../models/CodeEditor.model.js';
import Board from '../models/Whiteboard.model.js';
import Member from '../models/Member.model.js';
export function guardResourceEvents(socket, models = { Doc, Code, Board, Member }) {
 socket.use(async ([event,data],next) => {
  let model,key,permission;
  if (/^(doc-|document-|join-doc$|leave-doc$)/.test(event)) [model,key,permission]=[models.Doc,'docId','EDIT_DOCS'];
  else if (/code-editor/.test(event)) [model,key,permission]=[models.Code,'codeEditorId','EDIT_CODE_EDITOR'];
  else if (/whiteboard|^draw-|^clear-canvas$|^cursor-move$/.test(event)) [model,key,permission]=[models.Board,'whiteboardId','EDIT_WHITEBOARD'];
  else return next();
  try {
   const resource=await model.findById(typeof data==='string'?data:data?.[key]).lean();
   const member=resource?.isActive && await models.Member.findOne({userId:socket.userId,workspaceId:resource.workspaceId}).populate('role');
   const readOnly=/join|leave|cursor|selection|typing/.test(event);
   if (!member || (!readOnly && String(resource.creatorId)!==String(socket.userId) && !member.role?.permissions?.includes(permission))) throw new Error('Forbidden');
   next();
  } catch { socket.emit('error',{message:'Not authorized to access this resource',code:'FORBIDDEN'}); }
 });
}
