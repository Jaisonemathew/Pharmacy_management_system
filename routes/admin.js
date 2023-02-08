const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
var db = require('../db');
var async = require('async');
var mysql = require('mysql');


router.use(bodyParser.urlencoded({
    extended: false
}));
router.use(bodyParser.json());


function check_staff(req, res) {
    user = req.session.loggedUser;
    if (user.UserType === 'staff' || user.UserType === 'Staff') {
        res.redirect('/admin');
        return;
    }
}

// session validation
router.use('*', function (req, res, next) {
    if (!req.session.loggedUser) {
        res.redirect('/');
        return;
    }
    next();
});

router.get('/', function (req, res) {

    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacy'
    });
    
    var totalSell = "select ROUND(SUM(Total_Payable),2) AS sells_count from bill_information";
    var todaySell = "select ROUND(SUM(Total_Payable),2) AS sells_count_today from bill_information where Date = CURDATE()";
    var totalUser = "SELECT COUNT(*) AS users_count FROM user_information";
    var totalBatch = "SELECT COUNT(*) AS batch_count FROM batch";
    var totalMedicine = "SELECT COUNT(*) AS med_count FROM medicine_information";
    var totalSupplier = "SELECT COUNT(*) AS sup_count FROM supplier";
    var totalCategory = "SELECT COUNT(*) AS cat_count FROM category";
    var totalGeneric = "SELECT COUNT(*) AS generic_count FROM drug_generic_name";
    var totalManufac = "SELECT COUNT(*) AS manufac_count FROM manufacturer";
    
    async.parallel([
        function (callback) {
            connection.query(totalSell, callback)
        },
        function (callback) {
            connection.query(todaySell, callback)
        },
        function (callback) {
            connection.query(totalUser, callback)
        },
        function (callback) {
            connection.query(totalBatch, callback)
        },
        function (callback) {
            connection.query(totalMedicine, callback)
        },
        function (callback) {
            connection.query(totalSupplier, callback)
        },
        function (callback) {
            connection.query(totalCategory, callback)
        },
        function (callback) {
            connection.query(totalGeneric, callback)
        },
        function (callback) {
            connection.query(totalManufac, callback)
        }
    ], function (err, rows) {
    
    
        console.log(rows[0][0]);
        console.log(rows[1][0]);
        console.log(rows[2][0]);
    
    
        // those data needs to be shown on view_admin.ejs
        // Dashboard page requires those data
        // NOT WORKING PROPERLY
    
        res.render('view_admin', {
            'totalSell': rows[0][0],
            'todaySell': rows[1][0],
            'totalUser': rows[2][0],
            'totalBatch': rows[3][0],
            'totalMedicine': rows[4][0],
            'totalSupplier': rows[5][0],
            'totalCategory': rows[6][0],
            'totalGeneric': rows[7][0],
            'totalManufac': rows[8][0],
            'user': req.session.loggedUser
        });
    });
    

    // res.render('view_admin', {
    //     user: req.session.loggedUser
    // });
});



router.get('/medicineSearch/:n', function (req, res) {

    var name = req.params.n;
    console.log(name);
    var query = "SELECT * FROM medicine_information WHERE Medicine_Name = ? ";

    db.getData(query, [name], function (rows) {
        var data = {
            'result': rows[0]
        };
        res.return(data);
    });
});




router.get('/user', function (req, res) {
    res.render('view_welcome', {
        user: req.session.loggedUser
    });
});

router.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/');
});


router.get('/sale', function (req, res) {
    var query = "SELECT b.*, m.Medicine_Name, s.Supplier_Name FROM batch b INNER JOIN medicine_information m on b.Medicine_ID = m.ID INNER JOIN supplier s on b.Supplier_ID = s.ID";

    db.getData(query, null, function (rows) {
        var data = {
            'batch': rows,
            user: req.session.loggedUser
        };
        res.render('new_sale', data);
    });
});

router.post('/sale', function (req, res) {
    var billInfo = {
        Invoice_No: req.body.invoice_number,
        Total_Amount: req.body.totalAmount,
        Discount: req.body.discount,
        Discount_Amount: req.body.discountAmount,
        Total_Payable: req.body.totalPayable,
        Paid: req.body.paid,
        Returned: req.body.return,
        Date: req.body.entry_date
    };
    console.log(billInfo);
    var query = "INSERT INTO bill_information SET ?";
    db.getData(query, [billInfo], function (rows) {
        console.log(rows);
        res.redirect('/admin/sale');
    });
});

router.get('/saleshistory', function (req, res) {
    var query = "SELECT * FROM bill_information";
    db.getData(query, null, function (rows) {
        var data = {
            'billInfo': rows,
            user: req.session.loggedUser
        };
        res.render('sales_history', data);
    });
});



router.get('/genericname', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT * FROM drug_generic_name";
    db.getData(query, null, function (rows) {
        var data = {
            'generic': rows,
            user: req.session.loggedUser

        };
        res.render('generic_name_index', data);
    });
});

router.get('/genericname/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    res.render('generic_name_create', {
        user: req.session.loggedUser,
        message: '',
        message_type: '',
        errors: ''
    });
});

router.post('/genericname/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validations
    req.checkBody('generic_name', 'Generic Name is required').notEmpty();
    req.checkBody('description', 'Description is required').notEmpty();

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            res.render('generic_name_create', {
                message: '',
                message_type: '',
                errors: result.array(),
                user: req.session.loggedUser,
            });

        } else {
            var generic = {
                generic_name: req.body.generic_name,
                description: req.body.description
            };
            console.log(generic);
            var query = "INSERT INTO drug_generic_name SET ?";
            db.getData(query, [generic], function (rows) {
                console.log(rows);
                res.redirect('/admin/genericname');
            });
        }

    });


});


router.get('/genericname/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "SELECT * FROM drug_generic_name WHERE ID = ? ";

    db.getData(query, [id], function (rows) {
        var data = {
            'genericNameEdit': rows[0],
            'user': req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        };
        res.render('generic_name_edit', data);
    });
});

router.post('/genericname/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);


    //validations
    req.checkBody('generic_name', 'Generic Name is required').notEmpty();
    req.checkBody('description', 'Description is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var id = req.params.id;
            var query = "SELECT * FROM drug_generic_name WHERE ID = ? ";

            db.getData(query, [id], function (rows) {
                var data = {
                    'genericNameEdit': rows[0],
                    'user': req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                };
                res.render('generic_name_edit', data);
            });

        } else {
            var id = req.params.id;
            var genericUpdate = {
                Generic_Name: req.body.generic_name,
                Description: req.body.description,
            };
            var query = "UPDATE drug_generic_name SET ? WHERE ID = ?";
            db.getData(query, [genericUpdate, id], function (rows) {
                res.redirect('/admin/genericname');
            });
        }

    });

});

router.get('/genericname/delid=:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "DELETE FROM drug_generic_name WHERE ID = ?";
    db.getData(query, [id], function (rows) {
        res.redirect('/admin/genericname');
    });

});


router.get('/batch', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT b.*, m.Medicine_Name, s.Supplier_Name FROM batch b INNER JOIN medicine_information m on b.Medicine_ID = m.ID INNER JOIN supplier s on b.Supplier_ID = s.ID";
    db.getData(query, null, function (rows) {
        var data = {
            'batch': rows,
            'user': req.session.loggedUser
        };
        console.log(data);
        res.render('batch_index', data);
    });
});

router.get('/batch/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacy'
    });

    var medicineName = "SELECT * FROM Medicine_Information";
    var supplier = "SELECT * FROM Supplier";
    async.parallel([
        function (callback) {
            connection.query(medicineName, callback)
        },
        function (callback) {
            connection.query(supplier, callback)
        }
    ], function (err, rows) {
        //console.log(RowDataPacket);
        res.render('batch_create', {
            medicinename: rows[0][0],
            suppliername: rows[1][0],
            user: req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        });
    });
});

router.post('/batch/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validations
    req.checkBody('batch_id', 'Batch ID is required').notEmpty();
    req.checkBody('quantity', 'Quantity is required').notEmpty();
    req.checkBody('cost_price', 'Cost Price is required').notEmpty();
    req.checkBody('sell_price', 'Sell Price is required').notEmpty();
    req.checkBody('production_date', 'Production Date is required').notEmpty();
    req.checkBody('expire_date', 'Expire Date is required').notEmpty();
    req.checkBody('medicine_name', 'Medicine Name is required').notEmpty();
    req.checkBody('supplier_name', 'Supplier Name is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var connection = mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'pharmacy'
            });

            var medicineName = "SELECT * FROM Medicine_Information";
            var supplier = "SELECT * FROM Supplier";
            async.parallel([
                function (callback) {
                    connection.query(medicineName, callback)
                },
                function (callback) {
                    connection.query(supplier, callback)
                }
            ], function (err, rows) {
                //console.log(RowDataPacket);
                res.render('batch_create', {
                    medicinename: rows[0][0],
                    suppliername: rows[1][0],
                    user: req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                });
            });

        } else {

            var batch = {
                Batch_ID: req.body.batch_id,
                Quantity: req.body.quantity,
                Cost_Price: req.body.cost_price,
                Sell_Price: req.body.sell_price,
                Production_Date: req.body.production_date,
                Expire_Date: req.body.expire_date,
                Medicine_ID: req.body.medicine_name,
                Supplier_ID: req.body.supplier_name
            };
            console.log(batch);
            var query = "INSERT INTO Batch SET ?";
            db.getData(query, [batch], function (rows) {
                console.log(rows);
                res.redirect('/admin/batch');
            });

        }
    });

});


router.get('/batch/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "SELECT * FROM batch WHERE id = ? ";

    db.getData(query, [id], function (rows) {
        var data = {
            'batchInfoEdit': rows[0],
            'user': req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        };
        res.render('batch_edit', data);
    });
});

router.post('/batch/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);


    //validations
    req.checkBody('sellPrice', 'Sell Price is required').notEmpty();

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {

            var id = req.params.id;
            var query = "SELECT * FROM batch WHERE id = ? ";

            db.getData(query, [id], function (rows) {
                var data = {
                    'batchInfoEdit': rows[0],
                    'user': req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                };
                res.render('batch_edit', data);
            });

        } else {

            var id = req.params.id;

            var batchUpdate = {
                Sell_Price: req.body.sellPrice,
            };

            var query = "UPDATE batch SET ? WHERE id = ?";

            db.getData(query, [batchUpdate, id], function (rows) {
                res.redirect('/admin/batch');
            });

        }
    });


});

router.get('/batch/delid=:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    console.log(id);
    var query = "DELETE FROM batch WHERE id= ?";

    db.getData(query, [id], function (rows) {
        res.redirect('/admin/batch');
    });
});

router.get('/category', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT * FROM category";
    db.getData(query, null, function (rows) {
        var data = {
            'category': rows,
            'user': req.session.loggedUser
        };
        res.render('category_index', data);
    });
});

router.get('/category/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var data = {
        message: '',
        message_type: '',
        errors: '',
        user: req.session.loggedUser
    }
    res.render('category_create', data);
});

router.post('/category/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validations
    req.checkBody('category', 'Category Name is required').notEmpty();

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            res.render('category_create', {
                message: '',
                message_type: '',
                errors: result.array(),
                user: req.session.loggedUser,
            });

        } else {

            var category = {
                category: req.body.category,
            };
            var query = "INSERT INTO category SET ?";
            db.getData(query, [category], function (rows) {
                console.log(rows);
                res.redirect('/admin/category');
            });

        }

    });

});


router.get('/category/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "SELECT * FROM category WHERE ID = ? ";

    db.getData(query, [id], function (rows) {
        var data = {
            'categoryEdit': rows[0],
            'user': req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        };
        res.render('category_edit', data);
    });
});

router.post('/category/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);


    //validations
    req.checkBody('category', 'Category Name is required').notEmpty();

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {

            var id = req.params.id;
            var query = "SELECT * FROM category WHERE ID = ? ";

            db.getData(query, [id], function (rows) {
                var data = {
                    'categoryEdit': rows[0],
                    'user': req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                };

                res.render('category_edit', data);
            });

        } else {

            var id = req.params.id;
            var categoryUpdate = {
                Category: req.body.category,
            };
            var query = "UPDATE category SET ? WHERE ID = ?";
            db.getData(query, [categoryUpdate, id], function (rows) {
                res.redirect('/admin/category');
            });

        }

    });

});

router.get('/category/delid=:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    console.log(id);
    var query = "DELETE FROM Category WHERE ID = ?";
    db.getData(query, [id], function (rows) {
        res.redirect('/admin/category');
    });
});


router.get('/manufacturer', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT * FROM manufacturer";
    db.getData(query, null, function (rows) {
        var data = {
            'manufacturer': rows,
            'user': req.session.loggedUser
        };
        res.render('manufacturer_index', data);
    });
});

router.get('/manufacturer/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var data = {
        message: '',
        message_type: '',
        errors: '',
        'user': req.session.loggedUser
    }
    res.render('manufacturer_create', data);
});


router.post('/manufacturer/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validation 
    req.checkBody('manufacturer_name', 'Manufacturer Name is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {
            res.render('manufacturer_create', {
                message: '',
                message_type: '',
                errors: result.array(),
                user: req.session.loggedUser,
            });
        } else {

            var manufacturer = {
                manufacturer_name: req.body.manufacturer_name,
            };
            var query = "INSERT INTO manufacturer SET ?";
            db.getData(query, [manufacturer], function (rows) {
                console.log(rows);
                res.redirect('/admin/manufacturer');
            });

        }
    });


});


router.get('/manufacturer/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "SELECT * FROM manufacturer WHERE ID = ? ";

    db.getData(query, [id], function (rows) {
        var data = {
            'manufacturerNameEdit': rows[0],
            'user': req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        };
        res.render('manufacturer_edit', data);
    });
});

router.post('/manufacturer/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validation 
    req.checkBody('manufacturer_name', 'Manufacturer Name is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var id = req.params.id;
            var query = "SELECT * FROM manufacturer WHERE ID = ? ";

            db.getData(query, [id], function (rows) {
                var data = {
                    'manufacturerNameEdit': rows[0],
                    'user': req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                };
                res.render('manufacturer_edit', data);
            });

        } else {

            var id = req.params.id;
            var manufacturerUpdate = {
                Manufacturer_Name: req.body.manufacturer_name,
            };
            var query = "UPDATE manufacturer SET ? WHERE ID = ?";
            db.getData(query, [manufacturerUpdate, id], function (rows) {
                res.redirect('/admin/manufacturer');
            });

        }
    });

});

router.get('/manufacturer/delid=:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    console.log(id);
    var query = "DELETE FROM Manufacturer WHERE ID = ?";
    db.getData(query, [id], function (rows) {
        res.redirect('/admin/manufacturer');
    });
});




router.get('/medicine', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT m.*, g.Generic_Name, z.Manufacturer_Name, p.Category FROM medicine_information m INNER JOIN drug_generic_name g on m.Generic_ID = g.ID INNER JOIN manufacturer z on m.Manufacturer_ID = z.ID INNER JOIN category p on m.Category_ID = p.ID";
    db.getData(query, null, function (rows) {
        var data = {
            'medicine': rows,
            user: req.session.loggedUser
        };
        res.render('medicine_index', data);
    });
});

router.get('/medicine/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacy'
    });

    var generic = "SELECT * FROM drug_generic_name";
    var manufacturer = "SELECT * FROM manufacturer";
    var category = "SELECT * FROM category";
    async.parallel([
        function (callback) {
            connection.query(generic, callback)
        },
        function (callback) {
            connection.query(manufacturer, callback)
        },
        function (callback) {
            connection.query(category, callback)
        }
    ], function (err, rows) {
        //console.log(RowDataPacket);
        res.render('medicine_create', {
            genericname: rows[0][0],
            manufacturername: rows[1][0],
            categoryname: rows[2][0],
            user: req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        });
    });

});

router.post('/medicine/create', function (req, res) {

    //staff checking
    check_staff(req, res);


    //validations
    req.checkBody('medicine_name', 'Medicine Name is required').notEmpty();
    req.checkBody('category', 'Category is required').notEmpty();
    req.checkBody('generic_name', 'Generic Name is required').notEmpty();
    req.checkBody('manufacturer_name', 'Manufacturer Name is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var connection = mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'pharmacy'
            });

            var generic = "SELECT * FROM drug_generic_name";
            var manufacturer = "SELECT * FROM manufacturer";
            var category = "SELECT * FROM category";
            async.parallel([
                function (callback) {
                    connection.query(generic, callback)
                },
                function (callback) {
                    connection.query(manufacturer, callback)
                },
                function (callback) {
                    connection.query(category, callback)
                }
            ], function (err, rows) {
                res.render('medicine_create', {
                    genericname: rows[0][0],
                    manufacturername: rows[1][0],
                    categoryname: rows[2][0],
                    user: req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                });
            });

        } else {

            var medicine = {
                Medicine_Name: req.body.medicine_name,
                Category_ID: req.body.category,
                Generic_ID: req.body.generic_name,
                Manufacturer_ID: req.body.manufacturer_name
            };
            console.log(medicine);
            var query = "INSERT INTO medicine_information SET ?";
            db.getData(query, [medicine], function (rows) {
                console.log(rows);
                res.redirect('/admin/medicine');
            });

        }

    });


});



router.get('/medicine/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'pharmacy'
    });

    var id = req.params.id;
    var query = "SELECT * FROM medicine_information WHERE ID = ? ";
    var genricName = "SELECT * FROM drug_generic_name";
    var manufacturerName = "SELECT * FROM manufacturer";
    var categoryName = "SELECT * FROM category";


    async.parallel([
        function (callback) {
            connection.query(query, [id], callback)
        },
        function (callback) {
            connection.query(genricName, callback)
        },
        function (callback) {
            connection.query(manufacturerName, callback)
        },
        function (callback) {
            connection.query(categoryName, callback)
        }
    ], function (err, rows) {
        console.log(rows[0][0]);
        console.log(rows[1][0]);
        console.log(rows[2][0]);
        console.log(rows[3][0]);

        res.render('medicine_edit', {
            'medInfo': rows[0][0],
            'dGenericName': rows[1][0],
            'manuName': rows[2][0],
            'cateName': rows[3][0],
            user: req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        });
    });

});

router.post('/medicine/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);


    //validations
    req.checkBody('medicine_name', 'Medicine Name is required').notEmpty();
    req.checkBody('categoryname', 'Category is required').notEmpty();
    req.checkBody('genericName', 'Generic Name is required').notEmpty();
    req.checkBody('manuName', 'Manufacturer Name is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var connection = mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'pharmacy'
            });

            var id = req.params.id;
            var query = "SELECT * FROM medicine_information WHERE ID = ? ";
            var genricName = "SELECT * FROM drug_generic_name";
            var manufacturerName = "SELECT * FROM manufacturer";
            var categoryName = "SELECT * FROM category";


            async.parallel([
                function (callback) {
                    connection.query(query, [id], callback)
                },
                function (callback) {
                    connection.query(genricName, callback)
                },
                function (callback) {
                    connection.query(manufacturerName, callback)
                },
                function (callback) {
                    connection.query(categoryName, callback)
                }
            ], function (err, rows) {

                console.log(rows[0][0]);
                console.log(rows[1][0]);
                console.log(rows[2][0]);
                console.log(rows[3][0]);

                res.render('medicine_edit', {
                    'medInfo': rows[0][0],
                    'dGenericName': rows[1][0],
                    'manuName': rows[2][0],
                    'cateName': rows[3][0],
                    user: req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                });
            });

        } else {

            var id = req.params.id;
            var medicineUpdate = {
                Medicine_Name: req.body.medicine_name,
                Category_ID: req.body.categoryname,
                Generic_ID: req.body.genericName,
                Manufacturer_ID: req.body.manuName
            };
            var query = "UPDATE medicine_information SET ? WHERE ID = ?";
            db.getData(query, [medicineUpdate, id], function (rows) {
                res.redirect('/admin/medicine');
            });
        }

    });


});



router.get('/medicine/delid=:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "DELETE FROM medicine_information WHERE ID = ?";
    db.getData(query, [id], function (rows) {
        res.redirect('/admin/medicine');
    });
});



router.get('/usermanagement', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT A.Name,A.Email,A.Gender,A.Date_of_Birth,A.Age,A.Address,A.Contact,A.Blood_Group,A.Marital_Status,A.Join_Date,A.Salary,A.Username,B.Password,B.Usertype FROM user_information A INNER JOIN user_access B ON A.Username=B.Username;";
    db.getData(query, null, function (rows) {
        var data = {
            'userInformation': rows,
            'user': req.session.loggedUser
        };
        res.render('user_management_index', data);
    });
});

router.get('/usermanagement/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var data = {
        'user': req.session.loggedUser
    }
    res.render('user_management_create', data);
});

router.post('/usermanagement/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var user_infromation = {
        Name: req.body.name,
        Email: req.body.email,
        Gender: req.body.gender,
        Date_of_Birth: req.body.user_dob,
        Age: req.body.age,
        Address: req.body.address,
        Contact: req.body.contact,
        Blood_Group: req.body.blood_group,
        Marital_Status: req.body.marital_status,
        Join_Date: req.body.join_date,
        Salary: req.body.salary,
        Username: req.body.username
    };
    var user_access = {
        Username: req.body.username,
        Password: req.body.password,
        Usertype: req.body.usertype,
    };
    console.log(user_infromation);
    console.log(user_access);
    var userAccessQuery = "INSERT INTO User_Access SET ?";
    var userInfoQuery = "INSERT INTO User_Information SET ?";

    db.getData(userAccessQuery, [user_access], function (rows) {
        db.getData(userInfoQuery, [user_infromation], function (err, rows) {
            res.redirect('/admin/usermanagement');
        });
    });
});

router.get('/usermanagement/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "SELECT * FROM user_information WHERE Username = ? ";

    db.getData(query, [id], function (rows) {
        var data = {
            'userInfoEdit': rows[0],
            'user': req.session.loggedUser
        };
        res.render('user_management_edit', data);
    });
});

router.post('/usermanagement/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var userUpdate = {
        Name: req.body.name,
        Email: req.body.email,
        Age: req.body.age,
        Address: req.body.address,
        Contact: req.body.contact,
        Salary: req.body.salary
    };
    var query = "UPDATE user_information SET ? WHERE Username = ?";
    db.getData(query, [userUpdate, id], function (rows) {
        res.redirect('/admin/usermanagement');
    });

});

router.get('/usermanagement/delid=:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "DELETE FROM user_access WHERE Username = ?";
    var query2 = "DELETE FROM user_information WHERE Username = ?";

    db.getData(query, [id], function (rows) {
        db.getData(query2, [id], function (rows) {
            res.redirect('/admin/usermanagement');
        });
    });
});



router.get('/supplier', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT * FROM Supplier";
    db.getData(query, null, function (rows) {
        var data = {
            'supplier': rows,
            'user': req.session.loggedUser
        };
        res.render('supplier_index', data);
    });
});

router.get('/supplier/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    var data = {
        user: req.session.loggedUser,
        message: '',
        message_type: '',
        errors: ''
    }
    res.render('supplier_create', data);
});

router.post('/supplier/create', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validations
    req.checkBody('supplier_name', 'Supplier Name is required').notEmpty();
    req.checkBody('contact', 'Contact is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty().isEmail();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var data = {
                user: req.session.loggedUser,
                message: '',
                message_type: '',
                errors: result.array()
            }

            res.render('supplier_create', data);

        } else {

            var supplier = {
                Supplier_Name: req.body.supplier_name,
                Contact: req.body.contact,
                Email: req.body.email,
            };
            console.log(supplier);
            var query = "INSERT INTO Supplier SET ?";
            db.getData(query, [supplier], function (rows) {
                console.log(rows);
                res.redirect('/admin/supplier');
            });

        }

    });


});

router.get('/supplier/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "SELECT * FROM Supplier WHERE ID = ? ";

    db.getData(query, [id], function (rows) {
        var data = {
            'supplierEdit': rows[0],
            user: req.session.loggedUser,
            message: '',
            message_type: '',
            errors: ''
        };
        res.render('supplier_edit', data);
    });
});

router.post('/supplier/edit/:id', function (req, res) {

    //staff checking
    check_staff(req, res);

    //validations
    req.checkBody('supplier_name', 'Supplier Name is required').notEmpty();
    req.checkBody('contact', 'Contact is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();

    req.getValidationResult().then(function (result) {

        if (!result.isEmpty()) {

            var id = req.params.id;
            var query = "SELECT * FROM Supplier WHERE ID = ? ";

            db.getData(query, [id], function (rows) {
                var data = {
                    'supplierEdit': rows[0],
                    user: req.session.loggedUser,
                    message: '',
                    message_type: '',
                    errors: result.array()
                };
                res.render('supplier_edit', data);
            });

        } else {

            var id = req.params.id;
            var supplierUpdate = {
                Supplier_Name: req.body.supplier_name,
                Contact: req.body.contact,
                Email: req.body.email
            };
            var query = "UPDATE Supplier SET ? WHERE ID = ?";
            db.getData(query, [supplierUpdate, id], function (rows) {
                res.redirect('/admin/supplier');
            });

        }

    });



});

router.get('/supplier/delid=:id', function (req, res) {
    //staff checking
    check_staff(req, res);

    var id = req.params.id;
    var query = "DELETE FROM supplier WHERE ID = ?";
    db.getData(query, [id], function (rows) {
        res.redirect('/admin/supplier');
    });
});



router.get('/add_batch', function (req, res) {

    //staff checking
    check_staff(req, res);

    var query = "SELECT mdicine_name FROM medicine_information";
    db.getData(query, null, function (rows) {
        //console.log(rows);
        var data = {
            'medName': rows,
            'user': req.session.loggedUser
        };
        res.render('view_add_batch', data);
    });
});

router.get('/add_batch/:id', function (req, res) {

    //staff checking
    check_staff(req, res);


    var id = req.params.id;
    var query = "SELECT * FROM medicine_information WHERE medicine_id = ?";
    db.getData(query, [id], function (rows) {
        var data = {
            'mname': rows[0],
            'user': req.session.loggedUser
        };
        res.render('view_add_batch', data);
    });
});

router.post('/add_batch/:id', function (req, res) {

    //staff checking
    check_staff(req, res);


    var id = req.params.id;
    var batchInfo = {
        batch_id: req.body.batch_id,
        stored_qty: req.body.stored_qty,
        cost_price: req.body.cost_price,
        sell_price: req.body.sell_price,
        production_date: req.body.production_date,
        expire_date: req.body.expire_date,
        purchase_id: req.body.purchase_id,
        medicine_id: req.body.medicine_id
    };
    console.log(batchInfo);
    //var query = "SELECT * FROM medicine_information WHERE medicine_id = ?";
    //db.getData(query, [id], function (rows) {
    //    var data = {'mname': rows[0]};
    //    res.render('view_add_batch', data);
    res.redirect('/admin/add_medicine');
    //});
});

module.exports = router;