export const idlFactory = ({ IDL }) => {
  const KeyComponent = IDL.Variant({
    'log' : IDL.Null,
    'contact' : IDL.Null,
    'expense' : IDL.Null,
    'order' : IDL.Null,
    'invoice' : IDL.Null,
    'note' : IDL.Null,
    'todo' : IDL.Null,
    'event' : IDL.Null,
    'calendar' : IDL.Null,
    'comment' : IDL.Null,
    'message' : IDL.Null,
    'checklist' : IDL.Null,
    'profile' : IDL.Null,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Int, 'err' : IDL.Text });
  const Atem = IDL.Variant({
    'bounty' : IDL.Nat,
    'invitation' : IDL.Nat,
    'activity' : IDL.Nat,
  });
  const NewApplication = IDL.Record({
    'atem' : Atem,
    'memo' : IDL.Text,
    'approver' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Comto__1 = IDL.Variant({
    'other' : IDL.Text,
    'note' : IDL.Nat,
    'todo' : IDL.Nat,
    'user' : IDL.Text,
    'event' : IDL.Nat,
    'calendar' : IDL.Nat,
  });
  const NewComment = IDL.Record({
    'comto' : Comto__1,
    'comment' : IDL.Text,
    'attachments' : IDL.Vec(IDL.Text),
  });
  const TypeNotification = IDL.Variant({
    'contact' : IDL.Nat,
    'other' : IDL.Null,
    'note' : IDL.Nat,
    'todo' : IDL.Nat,
    'user' : IDL.Text,
    'event' : IDL.Nat,
    'calendar' : IDL.Nat,
  });
  const NewNotification = IDL.Record({
    'note' : IDL.Text,
    'sender' : IDL.Text,
    'ntype' : TypeNotification,
    'receiver' : IDL.Text,
  });
  const HikingLog = IDL.Record({ 'logdata' : IDL.Text, 'logtype' : IDL.Text });
  const HikingData = IDL.Record({
    'eid' : IDL.Nat,
    'end' : IDL.Nat,
    'log' : IDL.Opt(HikingLog),
    'organizer' : IDL.Text,
    'elevation' : IDL.Opt(IDL.Nat),
    'distance' : IDL.Nat,
    'start' : IDL.Nat,
    'attendees' : IDL.Text,
  });
  const AccessKey = IDL.Record({
    'key' : IDL.Text,
    'keycomponent' : KeyComponent,
    'componentid' : IDL.Text,
    'expiredtime' : IDL.Int,
  });
  const Status = IDL.Variant({
    'created' : IDL.Null,
    'approved' : IDL.Null,
    'rejected' : IDL.Null,
  });
  const Application = IDL.Record({
    'id' : IDL.Nat,
    'status' : Status,
    'applicant' : IDL.Text,
    'atime' : IDL.Int,
    'atem' : Atem,
    'memo' : IDL.Text,
    'approver' : IDL.Text,
  });
  const Comto = IDL.Variant({
    'other' : IDL.Text,
    'note' : IDL.Nat,
    'todo' : IDL.Nat,
    'user' : IDL.Text,
    'event' : IDL.Nat,
    'calendar' : IDL.Nat,
  });
  const Comment = IDL.Record({
    'comto' : Comto__1,
    'user' : IDL.Text,
    'comment' : IDL.Text,
    'timestamp' : IDL.Int,
    'attachments' : IDL.Vec(IDL.Text),
  });
  const Function = IDL.Variant({
    'contact' : IDL.Nat,
    'other' : IDL.Null,
    'note' : IDL.Nat,
    'todo' : IDL.Nat,
    'user' : IDL.Text,
    'event' : IDL.Nat,
    'calendar' : IDL.Nat,
    'comment' : IDL.Nat,
  });
  const Action = IDL.Variant({
    'read' : IDL.Null,
    'delete' : IDL.Null,
    'create' : IDL.Null,
    'update' : IDL.Null,
  });
  const Log = IDL.Record({
    'function' : Function,
    'action' : Action,
    'user' : IDL.Text,
    'logtime' : IDL.Int,
    'message' : IDL.Text,
  });
  const Inbox = IDL.Record({
    'id' : IDL.Text,
    'owner' : IDL.Principal,
    'name' : IDL.Text,
  });
  const Message = IDL.Record({
    'id' : IDL.Nat,
    'note' : IDL.Text,
    'sender' : IDL.Text,
    'isread' : IDL.Bool,
    'readtime' : IDL.Int,
    'replyid' : IDL.Opt(IDL.Nat),
    'attachment' : IDL.Opt(IDL.Text),
    'receiver' : IDL.Text,
    'sendtime' : IDL.Int,
  });
  const Notification = IDL.Record({
    'id' : IDL.Nat,
    'note' : IDL.Text,
    'sender' : IDL.Text,
    'isread' : IDL.Bool,
    'readtime' : IDL.Int,
    'ntype' : TypeNotification,
    'receiver' : IDL.Text,
    'sendtime' : IDL.Int,
  });
  const NewLog = IDL.Record({
    'function' : Function,
    'action' : Action,
    'user' : IDL.Text,
    'message' : IDL.Text,
  });
  const NewMessage = IDL.Record({
    'note' : IDL.Text,
    'replyid' : IDL.Opt(IDL.Nat),
    'attachment' : IDL.Opt(IDL.Text),
    'receiver' : IDL.Text,
  });
  const MessageTo = IDL.Text;
  const Subject = IDL.Text;
  const Content = IDL.Text;
  const Sender = IDL.Text;
  const Ram = IDL.Service({
    'addAccessKey' : IDL.Func(
        [IDL.Opt(IDL.Text), KeyComponent, IDL.Text, IDL.Int],
        [Result_2],
        [],
      ),
    'addAdmin' : IDL.Func([IDL.Text], [Result_1], []),
    'addAllow' : IDL.Func([IDL.Text], [Result_1], []),
    'addApplication' : IDL.Func([NewApplication], [Result], []),
    'addComment' : IDL.Func([NewComment], [Result], []),
    'addNotification' : IDL.Func([NewNotification], [], []),
    'availableCycles' : IDL.Func([], [IDL.Nat], ['query']),
    'createHiking' : IDL.Func([HikingData], [Result], []),
    'deleteNotification' : IDL.Func([IDL.Nat], [Result], []),
    'findUserHiking' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Nat],
        [IDL.Vec(HikingData)],
        ['query'],
      ),
    'getAccessKey' : IDL.Func(
        [KeyComponent, IDL.Text],
        [IDL.Opt(AccessKey)],
        [],
      ),
    'getAdmins' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'getAllows' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'getApplications' : IDL.Func([Atem], [IDL.Vec(Application)], []),
    'getBackupState' : IDL.Func([], [IDL.Nat], ['query']),
    'getComments' : IDL.Func([Comto, IDL.Nat], [IDL.Vec(Comment)], ['query']),
    'getLogs' : IDL.Func([IDL.Nat], [IDL.Vec(Log)], ['query']),
    'getMyInboxes' : IDL.Func([], [IDL.Vec(Inbox)], ['query']),
    'getMyMessages' : IDL.Func(
        [IDL.Bool, IDL.Nat],
        [IDL.Vec(Message)],
        ['query'],
      ),
    'getMyNotifications' : IDL.Func(
        [IDL.Bool, IDL.Nat],
        [IDL.Vec(Notification)],
        ['query'],
      ),
    'getSystemData' : IDL.Func(
        [],
        [
          IDL.Record({
            'memory' : IDL.Nat,
            'heap' : IDL.Nat,
            'cycles' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getUserLogs' : IDL.Func([IDL.Nat], [IDL.Vec(Log)], ['query']),
    'hookInbox' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'log' : IDL.Func([NewLog], [], []),
    'message' : IDL.Func([NewMessage], [Result], []),
    'readMessage' : IDL.Func([IDL.Nat], [Result], []),
    'readNotification' : IDL.Func([IDL.Nat], [Result], []),
    'removeAccessKey' : IDL.Func([KeyComponent, IDL.Text], [], []),
    'searchInboxes' : IDL.Func([IDL.Text], [IDL.Vec(Inbox)], ['query']),
    'sendMessage' : IDL.Func(
        [MessageTo, Subject, Content, Sender],
        [Result_1],
        [],
      ),
    'updateApplication' : IDL.Func([IDL.Nat, Status], [Result], []),
  });
  return Ram;
};
export const init = ({ IDL }) => { return []; };
