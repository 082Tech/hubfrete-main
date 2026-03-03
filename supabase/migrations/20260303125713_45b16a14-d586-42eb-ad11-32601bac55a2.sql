-- Delete related address records first
DELETE FROM enderecos_carga WHERE carga_id = '0240af98-dcc5-4d52-a302-e225a4b7a40d';
-- Delete the incorrectly published cargo
DELETE FROM cargas WHERE id = '0240af98-dcc5-4d52-a302-e225a4b7a40d';