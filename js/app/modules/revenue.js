CDF.Models.Revenue.RevenueRow = Backbone.Model.extend({
	url: 'http://192.168.211.132:8080/revenue',
	defaults: function() {
		return {
			patientName: '',
			patientId:CDF.CONSTANTS.NULL,
			doctorName: '',
			doctorId:CDF.CONSTANTS.NULL,
			amount:0,
			paymentTypeName:"CASH",
			paymentTypeId:CDF.CONSTANTS.NULL,
			rowId:0,
			clinicId:"",
			date:"09.05.2013",
		}
	},
	validate: function(attrs, options) {
		this.validationError = "";

		if(attrs.patientId === CDF.CONSTANTS.NULL) 
			this.validationError += "No patient selected!\r\n"

		if(attrs.doctorId === CDF.CONSTANTS.NULL) 
			this.validationError += "No doctor selected!\r\n"

		if(parseInt(attrs.amount,10) <= 0) 
			this.validationError += "Invalid amount!\r\n"


	    if(this.validationError.length>0)
	     return this.validationError;
	},
	
});

CDF.Collections.Revenue.RevenueRowList = Backbone.Collection.extend({
	url: 'http://192.168.211.132:8080/revenue',
	model: CDF.Models.Revenue.RevenueRow,
	initialize: function(){
		var self = this;

		//_.bindAll(this,'resetMe'/*, 'submitReport'*/);
		CDF.vent.on('CDF.Models.Application:postReportStatus', this.reset, this);
		CDF.vent.on('CDF.Views.AppView:handleLogoutClick', this.reset, this);
		CDF.vent.on('CDF.Models.Application:submitReport', this.submitReport, this);

    },
	total: function() {
		this._total = 0;
		var self = this;
		_.each(this.models,function(row, i) {
			 self._total+= parseInt(row.get("amount"),10);
		});
		return this._total;
	},
	totalCash: function(){
		this._total = 0;
		var self = this;
		_.each(this.models,function(row, i) {
			if(row.get("paymentTypeName")==="CASH")
			 self._total+= parseInt(row.get("amount"),10);
		});
		return this._total;
	},
	totalCard: function(){
		this._total = 0;
		var self = this;
		_.each(this.models,function(row, i) {
			if(row.get("paymentTypeName")==="CARD")
			 self._total+= parseInt(row.get("amount"),10);
		});
		return this._total;
	},
	rowCount: function(){
		return this.models.length;
	},
	submitReport: function(msg){
		_.each(_.reject(this.models,function(element){return !element.isValid()},this),function(element,index,data){
                element.set('date',msg.date,{silent:true});   
                element.set('clinicId',msg.clinicId,{silent:true});
                element.save({},{

                    success: function(model, response, options){
                        console.log(response);

                        if(index === data.length - 1) {
                        	CDF.vent.trigger('CDF.Collections.RevenueRowList:submitReport','revenue');
                        }
                    },
                    error: function(model, error, options){
                        console.log(error);
                        success = false;
                    }

                });
        });
        
    }
});



CDF.Views.Revenue.RevenueRowView = Backbone.View.extend({
	model: new CDF.Models.Revenue.RevenueRow(),
	tagName: 'div',
	className: 'revenueRow',
	//id: this.cid,
	events: {
		'click .column': 'edit',
		'click .delete': 'delete',
		'blur .column': 'close',
		'keypress .column': 'onEnterUpdate',
		'click ul.dropdown-menu li': 'updatePaymentType'					
	},
	initialize: function() {
		this.template = _.template($('#revenue-row-template').html());
	},
	onClose: function(){

	},
	edit: function(ev) {
		ev.preventDefault();
		switch(ev.currentTarget.className.split(" ")[0]){
			case "patientName":
				//this.$('.removeAttr').patientName('readonly').focus();
				this.$('.patientName').attr("valueId", CDF.CONSTANTS.NULL);
				this.model.set("patientId",CDF.CONSTANTS.NULL,{silent:true});
				this.$('.patientName').val("");
				break;
			case "doctorName":
				//this.$('.doctorName').removeAttr('readonly').focus();
				this.$('.doctorName').attr("valueId", CDF.CONSTANTS.NULL);	
				this.model.set("doctorId",CDF.CONSTANTS.NULL,{silent:true});
				this.$('.doctorName').val("");				
				break;
			case "amount":
				//this.$('.amount').removeAttr('readonly').focus();
				break;
			case "paymentTypeName":
				//this.$('.paymentTypeName').removeAttr('readonly', true).focus();
				this.$('.paymentTypeName').attr("valueId", 0);
				this.model.set("paymentTypeId",0,{silent:true});	
				this.$('.paymentTypeName').val("");			
				break;
		}
	
	},
	close: function(ev) {
		var element = null;
		var propertyName = ev.currentTarget.className.split(" ")[0];
		switch(propertyName){
			case "patientName":
				element = this.$('.patientName');
				setElementValue.call(this,'patientId');
				break;
			case "doctorName":
				element = this.$('.doctorName');
				setElementValue.call(this,'doctorId');
				break;
			case "amount":
				element = this.$('.amount');
				setElementValue.call(this);
				CDF.vent.trigger('CDF.Views.Revenue.RevenueRowView:close:amount');
				break;
			case "paymentTypeName":
				element = this.$('.paymentTypeName');
				setElementValue.call(this,'paymentTypeId');
				break;
		}

		function setElementValue(propertyId){

			if(element !== null){				
				this.model.set(propertyName, element.attr("value"),{silent:true});
				if (false/*validate model*/) {
				 	element.addClass( 'input-validation-error' );
				 	//this.$('.revenueRow').tooltip({title:this.model.validationError,container:'.revenueRow',trigger:'hover'});
				 	//this.$('.patientName').tooltip('show');
					} else {
						element.removeClass( 'input-validation-error' );
						//element.tooltip('destroy');
					}					
					
				if(typeof propertyId !== "undefined"){
					var propertyValue = element.attr("valueId");
					if(propertyValue !== CDF.CONSTANTS.NULL) {
						this.model.set(propertyId,propertyValue,{silent:true});
						//element.attr('readonly',true);
					} else if(element.attr("value").trim().length > 0) this.whenValueIsNotSelected(propertyId,element.attr("value"));
				}
											
				

			}
		};

	},
	whenValueIsNotSelected : function(propertyId,propertyName){
		
		switch(propertyId){
			case "patientId":
				this.addNewPatient(propertyName);
				break;
			case "doctorId":
				this.addNewDoctor(propertyName);
				break;
			case "paymentTypeId":
				break;
		}
	},
	addNewPatient: function(propertyName){
		if(!CDF.isModalVisible){
			CDF.vent.trigger('CDF.Views.Revenue.RevenueRowView:addNewPatient',{patientNameString:propertyName});
		}		
	},
	addNewDoctor: function(propertyName){
		if(!CDF.isModalVisible){
			CDF.vent.trigger('CDF.Views.Revenue.RevenueRowView:addNewDoctor',{doctorNameString:propertyName});
		}		
	},
	onEnterUpdate: function(ev) {
		var self = this;
		if (ev.keyCode === 13) {
			this.close(ev);

			switch(ev.currentTarget.className.split(" ")[0]){
			case "patientName":
				_.delay(function() { self.$('.patientName').blur() }, 100);
				break;
			case "doctorName":
				_.delay(function() { self.$('.doctorName').blur() }, 100);
				break;
			case "amount":
				_.delay(function() { self.$('.amount').blur() }, 100);
				break;
			case "paymentTypeName":
				_.delay(function() { self.$('.paymentTypeName').blur() }, 100);
				break;
			}
			
		}
	},
	updatePaymentType: function(ev){
		ev.preventDefault();
		switch(ev.currentTarget.id){
			case "0":		
				this.model.set("paymentTypeId",0);
				this.model.set("paymentTypeName","CASH");
				break;
			case "1":
				this.model.set("paymentTypeId",1);
				this.model.set("paymentTypeName","CARD");		
				break;
		}
		this.render();		
	},
	delete: function(ev) {
		ev.preventDefault();
		this.model.destroy();
	},	
	render: function() {
		this.model.set("rowId",this.model.cid,{silent:true});
		this.$el.html(this.template(this.model.toJSON()));

		this.$('ul.dropdown-menu').html('<li id="0"><a href="#">CASH</a></li><li id="1"><a href="#">CARD</a></li>');

		function source(collection) {

			return function(query,process){
				var map = this.options.map;
				collection.fetch({data:{q:query},success: function(){
					var result = [];
					var data = collection.toJSON();								
					 _.each(data,function(element,index,data){
					 var name = element.firstName+" "+element.lastName+' # '+element._id;
						 result.push(name);
					 map[name] = (element._id);
					});

					process(result);
				}});
		}

		};

		function paymentOptionsSource(collection) {

			return function(query,process){
				var map = this.options.map;
				collection.fetch({data:{q:query},success: function(){
					var result = [];
					var data = collection.toJSON();								
					 _.each(data,function(element,index,data){
					 var name = element.name;
						 result.push(name);
					 map[name] = (element._id);
					});

					process(result);
				}});
			}

		};
		function updater(item){
			 
		 	 $( "#"+this.options.id ).attr("valueId", this.options.map[ item ] );
			 return item;
	 
		};

		this.$('.patientName').typeahead({source:source(new CDF.Collections.People.Patients()),updater:updater,minLength:3,id:"patientId"+this.model.cid,map:CDF.patientMap});
		this.$('.doctorName').typeahead({source:source(new CDF.Collections.People.Doctors()),updater:updater,minLength:3,id:"doctorId"+this.model.cid,map:CDF.doctorsMap});
		this.$('.paymentTypeName').typeahead({source:paymentOptionsSource(new CDF.Collections.Revenue.PaymentOptions()),updater:updater,minLength:3,id:"paymentTypeId"+this.model.cid,map:CDF.paymentOptionsMap});
		return this;
	}
	
});	

CDF.Views.Revenue.RevenueTableView = Backbone.View.extend({
	model: CDF.Models.Revenue.RevenueRowList,
    events: {
		'click .new-row' : 'handleNewRowSubmit'		
    },
	initialize: function() {
		this.template = _.template($('#revenue-table-template').html());
		this.$el.html(this.template(this.model.toJSON()));	

		this.model.on('add', this.render, this);
		this.model.on('remove', this.render, this);
		this.model.on('reset' , this.render, this);


		CDF.vent.on('CDF.Views.Revenue.RevenueRowView:close:amount', this.updateTotal, this);
		
		if(this.model.length < 1)
			this.addNewRow();
	},
	onClose: function(){
		CDF.vent.off('CDF.Views.Revenue.RevenueRowView:close:amount', this.updateTotal, this);
		this.model.off('add', this.render, this);
		this.model.off('remove', this.render, this);
		this.model.off('reset' , this.render, this);
	},
	handleNewRowSubmit: function(ev){
		ev.preventDefault();
		this.addNewRow();
		return false;
	},	
	addNewRow: function() {
    	var row = new CDF.Models.Revenue.RevenueRow({patientName: "", patientId:CDF.CONSTANTS.NULL, doctorName:"",doctorId:CDF.CONSTANTS.NULL,amount:0,paymentTypeName:"CASH",
    												 paymentTypeId:0,rowId:0,clinicId:0,date:new Date()});

    	row.on("invalid", function(model, error) {
		  alert(error);
		});

		this.model.add(row);
		
	},	
	render: function() {

		var self = this;
		
		this.$('#rows-container').html('');
							
		_.each(this.model.toArray(), function(row, i) {
			self.$('#rows-container').append((new CDF.Views.Revenue.RevenueRowView({model: row})).render().$el);
		});
		this.$('.total').text("Total : Rs. "+this.model.total());
		

		return this;
	},
	updateTotal: function(){
		this.$('.total').text("Total : Rs. "+this.model.total());
	}
});