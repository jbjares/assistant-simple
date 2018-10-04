// Modulo para funções de armazenamento de informações no CloudantDB

let Cloudant = require('@cloudant/cloudant');

// Credenciais de acesso ao DB
var username = process.env.cloudant_username || '<username>';
var password = process.env.cloudant_password || '<password>';

let cloudant = Cloudant({account:username, password:password});

// Informar o nome do banco de dados a ser criado, ex.: cadastro
// Remove qualquer banco existente com o nome dado
/*
cloudant.db.destroy('reunioes', function(err) {
    // Cria o banco com o nome indicado
    cloudant.db.create('reunioes', function() {
        // Configura para usar o banco criado
        let db = cloudant.db.use('reunioes');
        // função do doc Search Index
        let BuscaID = function (doc) {
            index('id', doc._id,{"store":true, "facet":true});
            index('rev',doc._rev,{"store":true, "facet":true});
            index(doc._id,doc._rev);
        };
        // Estrutura do doc SearchIndex
        let ddoc = {
            _id: '_design/Conversation_ID',
            indexes: {
                BuscaID: {
                    analyzer: {name: 'standard'},
                    index   : BuscaID
                }
            }
        };
        // Insere design Document no banco de dados
        db.insert(ddoc, function (er, result) {
            if (er) {
                throw er;
            }
            console.log('Design Document criado');
        });
    });
});
*/

// Variáveis a serem iniciadas
let inicio = null;
let data = null;
let entry = null;
let dialogo = {};
let text= [];
let i=0;
let dialogStack = {};

// Função para armazenar docs
exports.database = function database(conversation_id,input,output){
    if (!dialogo[conversation_id]){
        i=0;
        text = [];
    } else{
        i = dialogo[conversation_id].length;
        text = dialogo[conversation_id];
    }
    //dialogStack[conversation_id]=[{dialogo:dialogo[conversation_id]}];

    // Armazena a data da primeira iteração
    if (inicio == null){
        inicio = new Date(Date.now()).toUTCString();
    }
    // Armazena a data a cada iteração, tanto do robo quanto do usuário
    data = new Date(Date.now()).toUTCString();
    // Mensagens vindas do usuario
    if (input !== null || input !== undefined || input !== 'undefined'){
        entry = "USUÁRIO: "+ input;
        text[i++] = entry;
    } if (output !== null || output !== undefined || output !== 'undefined'){
        entry = "ASSISTENTE: "+ output;
        text[i++] = entry;
    }
    dialogo[conversation_id]=text;
    i=0;
    text = [];

    // A id do documento corresponderá a id do usuário do facebook
    dialogStack[conversation_id]=[{_id: conversation_id, inicioConversa: inicio, fimConversa: data,dialogo:dialogo[conversation_id]}];
    console.log('doc: ',JSON.stringify(dialogStack));
    insertData(conversation_id);
};

insertData = function insertData(conversation_id){
    let _rev = null;
    let doc = dialogStack[conversation_id];
    //=====================================
    // Alterar para o nome do banco criado
    let db = cloudant.db.use('contatos');
    // Verifica se há algum doc que corresponda com a id da conversa.
    /*db.search('Conversation_ID', 'BuscaID', {q: 'id:"' + conversation_id + '"'}, function (er, result) {
        if (er) {
            throw er;
        }
        console.log('Foi encontrado %d doc', result.total_rows);
        for (var i = 0; i < result.rows.length; i++) {
            console.log('Documento: ', result.rows[i].id);
            //text = text + '\n'+result.rows[i].id;
            // O numero 'rev' do documento é capturado para que o documento possa ser atualizado após o armazenamento
            _rev = result.rows[i].fields.rev;
        }
        // No caso de existir um doc para esse usuário então o doc será atualizado, caso contrário será criado um novo doc
        if(_rev !== null){
            doc[0]._rev = _rev;
            console.log(doc[0]._rev);
        }
        bulk();
    });*/

    // Função que cria/atualiza doc em batch
    function bulk() {
        //console.log('Doc: ', doc);
      db.bulk({docs: doc}, function (err) {
            if (!err) {
                console.log('Dados armazenados.');
                //delete dialogStack[conversation_id];
                //delete dialogo[conversation_id];
                //console.log('dialogStack[%s] e dialogo[%s] deletados!',conversation_id,conversation_id);
            } else {
                throw err;
            }
        });
    }
};

// Depois de 1 hora sem qualquer acesso ao assistente os jsons de dialogos são apagados.
exports.deleteUserStacks = function deleteUserStacks(conversation_id) {
    delete dialogStack[conversation_id];
    delete dialogo[conversation_id];
    console.log('dialogStack[%s] e dialogo[%s] deletados!',conversation_id,conversation_id);
};
exports.deleteAlldbStacks = function deleteAlldbStacks() {
    dialogStack = {};
    dialogo = {};
    console.log('dialogStack e dialogo em cache, eliminados por inatividade!');
};