
-- Delete viagem_entregas links for duplicate viagens
DELETE FROM public.viagem_entregas WHERE viagem_id IN (
  '73afc823-4034-4969-a3ac-295393c0350f',
  '2696dc02-4c40-4609-94c8-d10ce21e4769',
  '4475d24e-0fc7-4819-944f-f8306f781def',
  'fa8a3238-507f-4868-8d06-b7c77e84949c',
  'c1d59235-e878-44d6-acce-d2b67ca5b5fd',
  '3cceae50-1738-4fbe-9773-cf39915c4772',
  '1f20bbd0-fa50-459b-9a19-c145d927e3fd',
  '42d2addb-2591-40fc-8b4a-de0a1df52558',
  '73ae75f5-f9a8-44d4-b4d5-e15c2d540985',
  'd31164dd-59a0-4c20-b95d-19d9c92e37f8',
  'd4548b40-95f7-4a65-afd7-0230e4569aa7',
  'c59fae18-f229-4713-a409-e99a2109d23a',
  '6ac15d09-7ee9-4891-8842-b40c8f06e099',
  '3131e47e-5277-401c-ac84-433e6a1a2f93',
  '95d3e42e-925b-4796-a60e-10a726798706',
  '6bb4a2e6-495e-4f89-8fe8-c47411ee3b42'
);

-- Delete the duplicate viagens
DELETE FROM public.viagens WHERE id IN (
  '73afc823-4034-4969-a3ac-295393c0350f',
  '2696dc02-4c40-4609-94c8-d10ce21e4769',
  '4475d24e-0fc7-4819-944f-f8306f781def',
  'fa8a3238-507f-4868-8d06-b7c77e84949c',
  'c1d59235-e878-44d6-acce-d2b67ca5b5fd',
  '3cceae50-1738-4fbe-9773-cf39915c4772',
  '1f20bbd0-fa50-459b-9a19-c145d927e3fd',
  '42d2addb-2591-40fc-8b4a-de0a1df52558',
  '73ae75f5-f9a8-44d4-b4d5-e15c2d540985',
  'd31164dd-59a0-4c20-b95d-19d9c92e37f8',
  'd4548b40-95f7-4a65-afd7-0230e4569aa7',
  'c59fae18-f229-4713-a409-e99a2109d23a',
  '6ac15d09-7ee9-4891-8842-b40c8f06e099',
  '3131e47e-5277-401c-ac84-433e6a1a2f93',
  '95d3e42e-925b-4796-a60e-10a726798706',
  '6bb4a2e6-495e-4f89-8fe8-c47411ee3b42'
);
